import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ArbiterLogo from './ArbiterLogo';
import { getStoredTickets } from '../data/ticketData';

const NAV = [
  {
    section: 'Operations',
    items: [
      { id: 'tickets',    icon: 'confirmation_number', label: 'Ticket Queue',   badge: 'count' },
      { id: 'overview',   icon: 'insights',            label: 'ROI Analytics',  tag: 'ROI' },
      { id: 'simulator',  icon: 'science',             label: 'AI Testbench',   tag: 'Lab' },
    ]
  },
  {
    section: 'Workspace',
    items: [
      { id: 'integrations', icon: 'hub',       label: 'Integrations' },
      { id: 'users',        icon: 'group',     label: 'Team Members' },
      { id: 'logs',         icon: 'terminal',  label: 'Audit Logs',   badge: 'logs' },
      { id: 'settings',     icon: 'settings',  label: 'Settings' },
    ]
  }
];

export default function Sidebar({ user, active, setActive, logCount }) {
  const [ticketCount, setTicketCount] = useState(() => getStoredTickets().length);

  useEffect(() => {
    fetch('/api/metrics').then(r => r.json())
      .then(d => { if (d?.total_ingested) setTicketCount(d.total_ingested); })
      .catch(() => {});
  }, [active]);

  return (
    <nav style={{
      width: 230,
      flexShrink: 0,
      background: '#FFFFFF',
      borderRight: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '1px 0 0 #E2E8F0, 2px 0 12px rgba(15,23,42,0.03)',
    }}>
      {/* Brand */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '1px solid #F1F5F9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ArbiterLogo size={32} animate />
          <div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 16, fontWeight: 800,
              color: '#0F172A', letterSpacing: '-0.025em', lineHeight: 1.1,
            }}>Arbiter</div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: '#6366F1',
              marginTop: 3, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#10B981', display: 'inline-block',
                boxShadow: '0 0 0 2px #D1FAE5',
                animation: 'pulse-dot 2.5s ease-in-out infinite',
              }} />
              MCP Engine
            </div>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {NAV.map(({ section, items }, si) => (
          <div key={section} style={{ marginBottom: si === 0 ? 18 : 6 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: '#94A3B8',
              padding: '6px 10px 8px',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>{section}</div>

            {items.map(item => {
              const on = active === item.id || (item.id === 'integrations' && active === 'dashboard');
              const countVal = item.badge === 'count' ? ticketCount : item.badge === 'logs' ? logCount : null;

              return (
                <motion.button key={item.id}
                  onClick={() => setActive(item.id)}
                  whileTap={{ scale: 0.975 }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 10px', cursor: 'pointer', borderRadius: 9,
                    border: 'none', marginBottom: 2, textAlign: 'left',
                    background: on ? '#EEF2FF' : 'transparent',
                    color: on ? '#4338CA' : '#475569',
                    fontSize: 13, fontWeight: on ? 600 : 450,
                    fontFamily: "'Inter',sans-serif",
                    transition: 'all 0.13s ease',
                    position: 'relative',
                    outline: 'none',
                  }}
                  onMouseEnter={e => {
                    if (!on) {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.color = '#1E293B';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!on) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#475569';
                    }
                  }}
                >
                  {/* Active pill bar */}
                  {on && (
                    <div style={{
                      position: 'absolute', left: 0, top: '18%', bottom: '18%',
                      width: 3, borderRadius: 999,
                      background: 'linear-gradient(180deg, #6366F1, #4F46E5)',
                    }} />
                  )}

                  <span className="mso" style={{
                    fontSize: 17, flexShrink: 0,
                    color: on ? '#4F46E5' : '#94A3B8',
                    fontVariationSettings: on
                      ? "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24"
                      : "'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24",
                  }}>{item.icon}</span>

                  <span style={{
                    flex: 1, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{item.label}</span>

                  {/* Count badge */}
                  {item.badge === 'count' && (
                    <span style={{
                      padding: '1px 7px',
                      background: on ? '#4F46E5' : '#F1F5F9',
                      border: `1px solid ${on ? '#4338CA' : '#E2E8F0'}`,
                      borderRadius: 999, fontSize: 10, fontWeight: 700,
                      color: on ? 'white' : '#64748B',
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}>{countVal}</span>
                  )}

                  {/* Tag badge */}
                  {item.tag && (
                    <span style={{
                      padding: '1px 6px',
                      background: '#EEF2FF',
                      border: '1px solid #C7D2FE',
                      borderRadius: 5, fontSize: 9, fontWeight: 700,
                      color: '#4F46E5',
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}>{item.tag}</span>
                  )}

                  {/* Logs count */}
                  {item.badge === 'logs' && logCount > 0 && (
                    <span style={{
                      padding: '1px 6px',
                      background: '#F1F5F9', border: '1px solid #E2E8F0',
                      borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#64748B',
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}>{logCount}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User tray */}
      <div style={{ padding: '10px 8px 14px', borderTop: '1px solid #F1F5F9' }}>
        <div
          onClick={() => setActive('settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px',
            background: '#F8FAFC', border: '1px solid #E2E8F0',
            borderRadius: 10, cursor: 'pointer', transition: 'all 0.14s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#EEF2FF';
            e.currentTarget.style.borderColor = '#C7D2FE';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#F8FAFC';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          {user.photoURL
            ? <img src={user.photoURL} alt="" style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '2px solid white', boxShadow: '0 0 0 1.5px #E2E8F0', flexShrink: 0,
              }} />
            : <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#4F46E5,#818CF8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: 'white',
              }}>
                {(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}
              </div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#0F172A',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{user.displayName || user.email}</div>
            <div style={{
              fontSize: 10, color: '#94A3B8',
              display: 'flex', alignItems: 'center', gap: 3, marginTop: 1,
            }}>
              <span className="mso fill sm" style={{ fontSize: 10, color: '#10B981' }}>verified</span>
              Admin Operator
            </div>
          </div>
          <span className="mso sm" style={{ fontSize: 13, color: '#CBD5E1' }}>chevron_right</span>
        </div>
      </div>
    </nav>
  );
}