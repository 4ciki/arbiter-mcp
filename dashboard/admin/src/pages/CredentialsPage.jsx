/**
 * CredentialsPage — shows live integration status for all services.
 * Each card has an inline Edit panel to update credentials without re-running the wizard.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  CheckCircle2, AlertTriangle, XCircle, Circle,
  Loader2, Edit3, X, Radio, Eye, EyeOff, Settings, Check
} from 'lucide-react';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { ServiceBrandIcon, GroqIcon, ClaudeLogo } from '../components/BrandLogos';
import {
  getLocalConfig,
  saveLocalConfig,
  saveBackendConfig,
  saveSupabaseConfig,
  saveFirestoreConfig,
  loadResilientConfig,
  mergeConfigs
} from '../data/configStorage';

// ── Helpers ─────────────────────────────────────────────────────────────────
const ST = {
  ok:   { bg:'#ECFDF5', border:'#A7F3D0', color:'#065F46', icon: CheckCircle2, strip:'#059669', label:'Verified'       },
  warn: { bg:'#FFFBEB', border:'#FDE68A', color:'#92400E', icon: AlertTriangle, strip:'#D97706', label:'Not Configured' },
  error:{ bg:'#FEF2F2', border:'#FECACA', color:'#991B1B', icon: XCircle,      strip:'#DC2626', label:'Error'          },
  idle: { bg:'#F8FAFC', border:'#E4E9F2', color:'#94A3B8', icon: Circle,       strip:'#E4E9F2', label:'Not Tested'     },
};

function timeSince(d) {
  if (!d) return null;
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Inline edit field ────────────────────────────────────────────────────────
function InlineField({ label, value, onChange, type = 'text', placeholder = '' }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{
        display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: '#64748B', marginBottom: 4, fontFamily: "'Plus Jakarta Sans',sans-serif"
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type === 'password' && !show ? 'password' : 'text'}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '8px 12px', boxSizing: 'border-box',
            background: '#F8FAFC', border: '1.5px solid #E4E9F2', borderRadius: 7,
            color: '#0F172A', fontFamily: "'Inter',sans-serif", fontSize: 12.5,
            outline: 'none', paddingRight: type === 'password' ? 36 : 12, transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.background = 'white'; }}
          onBlur={e => { e.target.style.borderColor = '#E4E9F2'; e.target.style.background = '#F8FAFC'; }}
        />
        {type === 'password' && (
          <button
            onClick={() => setShow(s => !s)}
            type="button"
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Per-card edit forms ───────────────────────────────────────────────────────
function EditForm({ defId, draft, onDraftChange }) {
  if (defId === 'jira') return (
    <>
      <InlineField label="Jira Site URL" placeholder="https://yourcompany.atlassian.net"
        value={draft?.jira?.site_url} onChange={v => onDraftChange('jira', 'site_url', v)} />
      <InlineField label="Account Email" placeholder="you@company.com"
        value={draft?.jira?.email} onChange={v => onDraftChange('jira', 'email', v)} />
      <InlineField label="API Token" type="password" placeholder="ATATT3x..."
        value={draft?.jira?.api_token} onChange={v => onDraftChange('jira', 'api_token', v)} />
    </>
  );
  if (defId === 'slack') return (
    <>
      <InlineField label="Bot User OAuth Token" type="password" placeholder="xoxb-..."
        value={draft?.slack?.bot_token} onChange={v => onDraftChange('slack', 'bot_token', v)} />
      <InlineField label="Signing Secret" type="password" placeholder="6878..."
        value={draft?.slack?.signing_secret} onChange={v => onDraftChange('slack', 'signing_secret', v)} />
      <InlineField label="Default Channel" placeholder="#it-support"
        value={draft?.slack?.channel} onChange={v => onDraftChange('slack', 'channel', v)} />
    </>
  );
  if (defId === 'llm') return (
    <>
      <div style={{ marginBottom: 10 }}>
        <label style={{
          display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: '#64748B', marginBottom: 6, fontFamily: "'Plus Jakarta Sans',sans-serif"
        }}>
          Provider
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['groq', 'claude'].map(p => {
            const active = (draft?.llm?.provider || 'groq') === p;
            return (
              <button key={p} onClick={() => onDraftChange('llm', 'provider', p)}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                  fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif",
                  border: `1.5px solid ${active ? (p === 'groq' ? '#F55036' : '#CC9B7A') : '#E4E9F2'}`,
                  background: active ? (p === 'groq' ? '#FFF1EE' : '#FDF8F4') : 'white',
                  color: active ? (p === 'groq' ? '#C0341D' : '#7C5535') : '#64748B', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {p === 'groq' ? <GroqIcon size={16} /> : <ClaudeLogo size={16} />}
                {p === 'groq' ? 'Groq' : 'Claude'}
              </button>
            );
          })}
        </div>
      </div>
      <InlineField
        label={(draft?.llm?.provider || 'groq') === 'groq' ? 'Groq API Key' : 'Anthropic API Key'}
        type="password"
        placeholder={(draft?.llm?.provider || 'groq') === 'groq' ? 'gsk_...' : 'sk-ant-...'}
        value={draft?.llm?.api_key}
        onChange={v => onDraftChange('llm', 'api_key', v)} />
    </>
  );
  if (defId === 'render') return (
    <InlineField label="Backend Deploy URL" placeholder="https://arbiter-mcp.onrender.com"
      value={draft?.deploy?.deploy_url} onChange={v => onDraftChange('deploy', 'deploy_url', v)} />
  );
  if (defId === 'database') return (
    <InlineField label="Database URL"
      placeholder="sqlite:///./arbiter.db or postgresql://user:pass@host/db"
      value={draft?.database?.database_url} onChange={v => onDraftChange('database', 'database_url', v)} />
  );
  return null;
}

// ── Service definitions ───────────────────────────────────────────────────────
const DEFS = [
  { id: 'jira',     name: 'Jira Service Management',   type: 'jira',     testType: 'jira'     },
  { id: 'slack',    name: 'Slack Workspace',            type: 'slack',    testType: 'slack'    },
  { id: 'llm',      name: 'AI Engine',                 type: 'groq',     testType: 'llm'      },
  { id: 'render',   name: 'Arbiter Backend',            type: 'render',   testType: 'render'   },
  { id: 'database', name: 'Database',                  type: 'database', testType: 'database' },
];

function isCfg(defId, cfg) {
  if (!cfg) return false;
  if (defId === 'jira')     return !!(cfg.jira?.site_url && cfg.jira?.email && cfg.jira?.api_token);
  if (defId === 'slack')    return !!(cfg.slack?.bot_token);
  if (defId === 'llm')      return !!(cfg.llm?.api_key || cfg.groq?.api_key);
  if (defId === 'render')   return !!(cfg.deploy?.deploy_url);
  if (defId === 'database') return !!(cfg.database?.database_url);
  return false;
}

function buildTestPayload(defId, cfg) {
  if (!cfg) return null;
  if (defId === 'jira')     return { type: 'jira', site_url: cfg.jira?.site_url, email: cfg.jira?.email, api_token: cfg.jira?.api_token };
  if (defId === 'slack')    return { type: 'slack', bot_token: cfg.slack?.bot_token };
  if (defId === 'llm') {
    const provider = cfg.llm?.provider || 'groq';
    const apiKey   = cfg.llm?.api_key || cfg.groq?.api_key || '';
    return { type: provider, api_key: apiKey };
  }
  if (defId === 'render')   return { type: 'render', deploy_url: cfg.deploy?.deploy_url };
  if (defId === 'database') return { type: 'database', database_url: cfg.database?.database_url };
  return null;
}

function getLLMLabel(cfg) {
  if (!cfg) return 'AI Engine';
  const provider = cfg.llm?.provider || 'groq';
  return provider === 'claude' ? 'Claude (Anthropic)' : 'Groq AI';
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CredentialsPage({ user, onLog }) {
  const [config,   setConfig]  = useState(null);
  const [states,   setStates]  = useState({});
  const [testing,  setTesting] = useState({});
  const [editing,  setEditing] = useState(null);  // defId being edited
  const [draft,    setDraft]   = useState({});
  const [saving,   setSaving]  = useState(false);
  const autoTestedRef          = useRef(false);

  const API_BASE_URL = (
    config?.deploy?.deploy_url ||
    import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'https://arbiter-mcp.onrender.com'
  ).replace(/\/$/, '');

  // Load config from LocalStorage immediately, then Backend Database & Firestore with auto-heal
  useEffect(() => {
    if (!user?.uid) return;
    autoTestedRef.current = false;

    // 1. Instant local read so UI is never blank
    const local = getLocalConfig(user.uid);
    if (local) {
      setConfig(local);
      setDraft(local);
    }

    // 2. Multi-tier resilient load (re-seeds backend if backend was wiped)
    loadResilientConfig({ apiBase: API_BASE_URL, uid: user.uid, db })
      .then(resilient => {
        if (resilient) {
          setConfig(prev => mergeConfigs(prev || {}, resilient));
          setDraft(prev => mergeConfigs(prev || {}, resilient));
        }
      })
      .catch(err => console.warn('Resilient config load error:', err));

    // 3. Listen to Firestore real-time updates
    const unsub = onSnapshot(doc(db, 'users', user.uid, 'config', 'credentials'),
      snap => {
        if (snap.exists() && snap.data()) {
          const sData = snap.data();
          setConfig(prev => {
            const merged = mergeConfigs(prev || {}, sData);
            saveLocalConfig(user.uid, merged);
            return merged;
          });
          setDraft(prev => mergeConfigs(prev || {}, sData));
        }
      },
      () => {}
    );

    // 4. Listen to cross-component config updates
    const handleConfigEvent = (e) => {
      if (e.detail) {
        setConfig(prev => mergeConfigs(prev || {}, e.detail));
        setDraft(prev => mergeConfigs(prev || {}, e.detail));
      }
    };
    window.addEventListener('arbiter_config_changed', handleConfigEvent);

    return () => {
      unsub();
      window.removeEventListener('arbiter_config_changed', handleConfigEvent);
    };
  }, [user?.uid, API_BASE_URL]);

  // Run initial test ONCE only when config first arrives
  useEffect(() => {
    if (!config || autoTestedRef.current) return;
    autoTestedRef.current = true;
    DEFS.forEach((def, i) => {
      if (isCfg(def.id, config)) {
        setTimeout(() => runTest(def.id, config), i * 400 + 200);
      } else {
        setStates(s => ({ ...s, [def.id]: { status: 'warn', msg: 'Not configured', latency: null, tested: null } }));
      }
    });
  }, [config]);

  async function runTest(defId, cfg) {
    const payload = buildTestPayload(defId, cfg || config);
    if (!payload) return;
    setTesting(t => ({ ...t, [defId]: true }));
    const t0 = Date.now();
    let result;
    try {
      const r = await fetch(`${API_BASE_URL}/api/test-credential`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      result = await r.json();
    } catch {
      result = { ok: false, message: 'Cannot reach the Arbiter backend' };
    }
    const st = {
      status: result.ok ? 'ok' : 'error',
      msg: result.message || '',
      latency: result.ok ? (Date.now() - t0) : null,
      tested: Date.now()
    };
    setStates(s => ({ ...s, [defId]: st }));
    setTesting(t => { const n = { ...t }; delete n[defId]; return n; });
    onLog?.(`${defId}: ${st.msg || (result.ok ? 'OK' : 'Failed')}`, result.ok ? 'success' : 'error');
  }

  function testAll() {
    DEFS.forEach((def, i) => {
      if (isCfg(def.id, config)) setTimeout(() => runTest(def.id, config), i * 450);
    });
  }

  function startEdit(defId) {
    setDraft(JSON.parse(JSON.stringify(config || {})));
    setEditing(defId);
  }

  function onDraftChange(section, key, val) {
    setDraft(d => ({ ...d, [section]: { ...(d[section] || {}), [key]: val } }));
  }

  async function saveEdit(defId) {
    setSaving(true);
    try {
      const merged = mergeConfigs(config || {}, draft || {}, {
        configured: true,
        updatedAt: new Date().toISOString()
      });

      // 1. Instant local + UI update (user sees success immediately)
      saveLocalConfig(user.uid, merged);
      setConfig(merged);
      setEditing(null);
      setSaving(false);
      toast.success('Credentials saved!');

      // 2. Fire cloud sync in background — all 3 tiers in parallel
      Promise.allSettled([
        saveSupabaseConfig(user.uid, merged, user.email || ''),
        saveBackendConfig(API_BASE_URL, user.uid, merged, user.email || ''),
        saveFirestoreConfig(db, user.uid, merged),
      ]).then(results => {
        const anyFail = results.some(r => r.status === 'rejected' || r.value === false || r.value === null);
        if (anyFail) toast('Synced locally. Cloud sync may retry.', { icon: '⚠️' });
      });

      // 3. Re-test this service
      setTimeout(() => runTest(defId, merged), 400);
    } catch (e) {
      toast.error('Failed to save credentials.');
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 800,
            color: '#0F172A', letterSpacing: '-0.02em'
          }}>
            Integration Status
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
            Live verification of all connected services · Click <strong>Edit</strong> to update any credential
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={testAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: '#4F46E5', border: 'none', borderRadius: 8,
              fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif",
              color: 'white', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79,70,229,0.25),inset 0 1px 0 rgba(255,255,255,0.15)'
            }}>
            <Radio size={14} /> Test All
          </motion.button>
        </div>
      </div>

      {/* No config banner */}
      {!config && (
        <div style={{
          padding: '14px 18px', background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
        }}>
          <AlertTriangle size={22} color="#D97706" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              No configuration found
            </div>
            <div style={{ fontSize: 12, color: '#78350F', marginTop: 2 }}>
              Click <strong>Edit</strong> on any card below to configure your credentials.
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {DEFS.map((def, idx) => {
          const st     = states[def.id];
          const busy   = !!testing[def.id];
          const stat   = st?.status || (isCfg(def.id, config) ? 'idle' : 'warn');
          const s      = ST[stat];
          const cfgd   = isCfg(def.id, config);
          const isEdit = editing === def.id;
          const IconComp = s.icon;

          const displayName = def.id === 'llm' ? getLLMLabel(config) : def.name;

          return (
            <motion.div key={def.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              style={{
                background: 'white', borderRadius: 12, border: `1px solid ${isEdit ? '#C7D2FE' : '#E4E9F2'}`,
                boxShadow: isEdit
                  ? '0 0 0 3px rgba(79,70,229,0.1), 0 4px 16px rgba(15,23,42,0.08)'
                  : '0 2px 8px rgba(15,23,42,0.06)',
                overflow: 'hidden', position: 'relative', transition: 'box-shadow 0.2s, border-color 0.2s',
              }}>
              {/* Top status strip */}
              <div style={{
                height: 3, background: isEdit ? '#4F46E5' : s.strip,
                boxShadow: (stat !== 'idle' || isEdit) ? `0 0 8px ${isEdit ? '#4F46E544' : s.strip + '44'}` : 'none',
                transition: 'background 0.2s'
              }} />

              {/* Loading overlay only when NOT editing */}
              <AnimatePresence>
                {busy && !isEdit && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 4, borderRadius: 12
                    }}>
                    <Loader2 size={26} color="#4F46E5" className="animate-spin" />
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: '#4F46E5',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase'
                    }}>
                      Testing…
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ padding: '16px 18px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 38, height: 38, flexShrink: 0,
                    background: def.id === 'llm'
                      ? 'linear-gradient(135deg,#EEF2FF,#FFF7ED)'
                      : def.type === 'slack' ? '#FFFFFF' : stat === 'ok' ? '#ECFDF5' : stat === 'error' ? '#FEF2F2' : stat === 'warn' ? '#FFFBEB' : '#F8FAFC',
                    border: `1px solid ${s.border}`, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(15,23,42,0.04)'
                  }}>
                    {def.id === 'llm' ? (
                      (config?.llm?.provider || 'groq') === 'claude'
                        ? <ClaudeLogo size={22} />
                        : <GroqIcon size={22} />
                    ) : (
                      <ServiceBrandIcon type={def.type} size={22} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: '#0F172A',
                      fontFamily: "'Plus Jakarta Sans',sans-serif"
                    }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                      {st?.tested ? `Tested ${timeSince(st.tested)}` : cfgd ? 'Configured' : 'Not configured'}
                    </div>
                  </div>

                  {/* Edit / Cancel button */}
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => isEdit ? setEditing(null) : startEdit(def.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                      background: isEdit ? '#F8FAFC' : '#EEF2FF',
                      border: `1px solid ${isEdit ? '#E4E9F2' : '#C7D2FE'}`, borderRadius: 7,
                      fontSize: 11, fontWeight: 700, color: isEdit ? '#64748B' : '#4F46E5', cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '0.04em',
                      textTransform: 'uppercase', transition: 'all 0.15s',
                    }}>
                    {isEdit ? <X size={13} /> : <Edit3 size={13} />}
                    {isEdit ? 'Cancel' : 'Edit'}
                  </motion.button>
                </div>

                {/* Status badge (hidden when editing) */}
                <AnimatePresence mode="wait">
                  {!isEdit && (
                    <motion.div key="status"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px 3px 8px', borderRadius: 999,
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        background: s.bg, border: `1px solid ${s.border}`, color: s.color
                      }}>
                        <IconComp size={13} color={s.strip} />
                        {s.label}
                      </span>
                      {st?.msg && stat !== 'ok' && (
                        <div style={{
                          marginTop: 8, fontSize: 12, lineHeight: 1.5, color: s.color,
                          padding: '6px 10px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 7
                        }}>
                          {st.msg}
                        </div>
                      )}
                      {st?.msg && stat === 'ok' && (
                        <div style={{ marginTop: 5, fontSize: 12, color: '#059669', fontWeight: 500 }}>
                          {st.msg}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Inline edit form */}
                  {isEdit && (
                    <motion.div key="edit"
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, marginTop: 4 }}>
                      <EditForm defId={def.id} draft={draft} onDraftChange={onDraftChange} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <motion.button whileTap={{ scale: 0.97 }} disabled={saving}
                          onClick={() => saveEdit(def.id)}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '8px 14px', background: saving ? '#6EE7B7' : '#059669', border: 'none',
                            borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                            boxShadow: '0 3px 10px rgba(5,150,105,0.25)'
                          }}>
                          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          {saving ? 'Saving…' : 'Save Changes'}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer: latency + test button */}
                {!isEdit && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: 10, marginTop: 10, borderTop: '1px solid #F8FAFC'
                  }}>
                    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: '#94A3B8' }}>
                      {st?.latency ? <span style={{ color: '#4F46E5', fontWeight: 600 }}>{st.latency}ms</span> : null}
                    </div>
                    {cfgd ? (
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => runTest(def.id, config)} disabled={busy}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                          background: '#F8FAFC', border: '1px solid #E4E9F2', borderRadius: 7,
                          fontSize: 11, fontWeight: 700, color: '#475569', cursor: busy ? 'not-allowed' : 'pointer',
                          fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase',
                          opacity: busy ? 0.5 : 1, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.color = '#4F46E5'; } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4E9F2'; e.currentTarget.style.color = '#475569'; }}>
                        <Radio size={12} />
                        {stat === 'ok' ? 'Re-test' : stat === 'error' ? 'Retry' : 'Test'}
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => startEdit(def.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 7,
                          fontSize: 11, fontWeight: 700, color: '#92400E', cursor: 'pointer',
                          fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase'
                        }}>
                        <Settings size={12} /> Configure
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}