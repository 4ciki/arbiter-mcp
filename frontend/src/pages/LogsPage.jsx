import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function LogsPage({ logs }) {
  const [tab, setTab] = useState('audit'); // 'audit' (SQLite) or 'system' (live)
  const [auditEvents, setAuditEvents] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadAudit() {
      try {
        setLoadingAudit(true);
        const res = await fetch('/api/audit?limit=100');
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data)) setAuditEvents(data);
        }
      } catch (err) {
        console.warn('Failed to fetch SQLite audit logs:', err);
      } finally {
        if (mounted) setLoadingAudit(false);
      }
    }
    loadAudit();
    return () => { mounted = false; };
  }, []);

  const c = { success: '#059669', error: '#DC2626', warn: '#D97706', info: '#4F46E5' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            System Audit & Activity Logs
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
            Immutable SQLite forensic audit trail and real-time MCP runtime events
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: '#E2E8F0', padding: 3, borderRadius: 10 }}>
          <button
            onClick={() => setTab('audit')}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif",
              background: tab === 'audit' ? 'white' : 'transparent',
              color: tab === 'audit' ? '#4F46E5' : '#64748B',
              boxShadow: tab === 'audit' ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            SQLite Audit Trail ({auditEvents.length})
          </button>
          <button
            onClick={() => setTab('system')}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif",
              background: tab === 'system' ? 'white' : 'transparent',
              color: tab === 'system' ? '#4F46E5' : '#64748B',
              boxShadow: tab === 'system' ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Live Console Events ({logs.length})
          </button>
        </div>
      </div>

      {/* Audit Log Table (SQLite) */}
      {tab === 'audit' && (
        <div style={{
          background: 'white', border: '1px solid #E4E9F2', borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(15,23,42,0.04)'
        }}>
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Immutable Audit Events ({auditEvents.length} records in arbiter.db)
            </div>
            <div style={{ fontSize: 11, color: '#10B981', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              Write-Only Cryptographic Log
            </div>
          </div>

          <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
            {loadingAudit && (
              <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                Loading SQLite audit records...
              </div>
            )}
            {!loadingAudit && auditEvents.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                No audit events found in arbiter.db
              </div>
            )}
            {!loadingAudit && auditEvents.map((ev) => {
              const eventColor = ev.event_type.includes('resolved') || ev.event_type.includes('approved') ? '#059669' :
                                 ev.event_type.includes('escalate') ? '#D97706' : '#4F46E5';
              const createdDate = ev.created_at ? new Date(ev.created_at).toLocaleString() : '—';
              return (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
                  borderBottom: '1px solid #F8FAFC', transition: 'background 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{
                    fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono',monospace",
                    width: 140, flexShrink: 0
                  }}>
                    {createdDate}
                  </span>

                  <span style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    fontFamily: "'JetBrains Mono',monospace",
                    background: '#F1F5F9', color: '#1E293B', width: 90, flexShrink: 0, textAlign: 'center'
                  }}>
                    {ev.ticket_id || `ID #${ev.id}`}
                  </span>

                  <span style={{
                    padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    color: eventColor, background: `${eventColor}14`, border: `1px solid ${eventColor}30`,
                    whiteSpace: 'nowrap', flexShrink: 0
                  }}>
                    {ev.event_type}
                  </span>

                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#475569', fontFamily: "'JetBrains Mono',monospace" }}>
                    {ev.score_components ? JSON.stringify(ev.score_components).slice(0, 110) + (JSON.stringify(ev.score_components).length > 110 ? '...' : '') : 'Event logged'}
                  </div>

                  <span style={{
                    fontSize: 10, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontWeight: 600, flexShrink: 0
                  }}>
                    Record #{ev.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live System Events Tab */}
      {tab === 'system' && (
        <div style={{
          background: 'white', border: '1px solid #E4E9F2', borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(15,23,42,0.04)', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto'
        }}>
          {logs.length === 0 && (
            <div style={{ padding: '24px 20px', fontSize: 13, color: '#94A3B8', fontFamily: "'JetBrains Mono',monospace" }}>
              Waiting for live console events…
            </div>
          )}
          {logs.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 18px', borderBottom: '1px solid #F8FAFC', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono',monospace", flexShrink: 0, paddingTop: 1 }}>{e.time}</span>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: c[e.level] || c.info, flexShrink: 0, marginTop: 6,
                boxShadow: `0 0 6px ${c[e.level] || c.info}66`
              }} />
              <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{e.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}