import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ArbiterLogo from './ArbiterLogo';
import { getStoredTickets } from '../data/ticketData';

const NAV_SECTIONS = [
  {
    title: 'Operations',
    items: [
      { id: 'tickets',    icon: 'confirmation_number', label: 'Tickets Queue',   badgeType: 'count' },
      { id: 'overview',   icon: 'insights',            label: 'Executive ROI',   badge: 'ROI' },
      { id: 'simulator',  icon: 'science',             label: 'AI Testbench',    badge: 'Lab' },
    ]
  },
  {
    title: 'Management',
    items: [
      { id: 'integrations', icon: 'hub',       label: 'Integrations & Health' },
      { id: 'logs',         icon: 'terminal',  label: 'Activity & Audit' },
      { id: 'users',        icon: 'group',     label: 'Team Members' },
      { id: 'settings',     icon: 'settings',  label: 'Settings & SLA' },
    ]
  }
];

export default function Sidebar({ user, active, setActive, logCount }) {
  const [ticketsCount, setTicketsCount] = useState(() => getStoredTickets().length);

  useEffect(() => {
    fetch('/api/metrics')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.total_ingested === 'number') {
          setTicketsCount(data.total_ingested);
        }
      })
      .catch(() => {});
  }, [active]);

  return (
    <nav style={{
      width: 236, flexShrink: 0, background: '#FAFBFC',
      borderRight: '1px solid #E4E9F2',
      display: 'flex', flexDirection: 'column',
      boxShadow: '2px 0 8px rgba(15,23,42,0.02)',
    }}>
      {/* Brand */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ArbiterLogo size={34} animate />
          <div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 17, fontWeight: 800,
              color: '#0F172A', letterSpacing: '-0.02em'
            }}>
              Arbiter
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: '#6366F1', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              MCP Engine v2.4
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.title} style={{ marginBottom: idx === 0 ? 16 : 8 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#94A3B8', padding: '6px 8px 6px', fontFamily: "'Plus Jakarta Sans',sans-serif"
            }}>
              {section.title}
            </div>

            {section.items.map(item => {
              const isActive = active === item.id || (item.id === 'integrations' && active === 'dashboard');
              const badgeText = item.badgeType === 'count' ? ticketsCount : item.badge;

              return (
                <motion.button key={item.id}
                  onClick={() => setActive(item.id)}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', cursor: 'pointer', borderRadius: 9,
                    border: 'none', marginBottom: 3,
                    background: isActive ? '#EEF2FF' : 'transparent',
                    color: isActive ? '#4F46E5' : '#475569',
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    fontFamily: "'Inter',sans-serif",
                    transition: 'all 0.12s', textAlign: 'left',
                    boxShadow: isActive ? 'inset 0 0 0 1px #C7D2FE' : 'none'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.color = '#0F172A';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#475569';
                    }
                  }}
                >
                  <span className="mso" style={{
                    fontSize: 18, flexShrink: 0,
                    color: isActive ? '#4F46E5' : '#64748B',
                    fontVariationSettings: isActive ? "'FILL' 1,'wght' 600,'GRAD' 0,'opsz' 24" : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                  }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>

                  {/* Badges */}
                  {item.id === 'tickets' && (
                    <span style={{
                      padding: '1px 6px', background: isActive ? '#4F46E5' : '#F1F5F9',
                      border: `1px solid ${isActive ? '#4338CA' : '#CBD5E1'}`,
                      borderRadius: 999, fontSize: 10, fontWeight: 700,
                      color: isActive ? 'white' : '#475569',
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}>
                      {badgeText}
                    </span>
                  )}

                  {item.badge && item.id !== 'tickets' && (
                    <span style={{
                      padding: '1px 6px',
                      background: item.badge === 'Live' ? '#ECFDF5' : '#EEF2FF',
                      border: `1px solid ${item.badge === 'Live' ? '#A7F3D0' : '#C7D2FE'}`,
                      borderRadius: 6, fontSize: 9, fontWeight: 700,
                      color: item.badge === 'Live' ? '#065F46' : '#4F46E5',
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}>
                      {item.badge}
                    </span>
                  )}

                  {item.id === 'logs' && logCount > 0 && (
                    <span style={{
                      padding: '1px 6px', background: '#F1F5F9', border: '1px solid #E2E8F0',
                      borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#64748B',
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}>
                      {logCount}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User tray */}
      <div style={{ padding: 10, borderTop: '1px solid #F1F5F9' }}>
        <div onClick={() => setActive('settings')} style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px',
          background: 'white', border: '1px solid #E4E9F2', borderRadius: 10, cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(15,23,42,0.05)', transition: 'all 0.13s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#C7D2FE';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(79,70,229,0.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#E4E9F2';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.05)';
        }}>
          {user.photoURL
            ? <img src={user.photoURL} alt="" style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '2px solid white', boxShadow: '0 0 0 1px #E4E9F2', flexShrink: 0
              }} />
            : <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#4F46E5,#818CF8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="mso fill" style={{ fontSize: 14, color: 'white' }}>person</span>
              </div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {user.displayName || user.email}
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
              <span className="mso fill sm" style={{ fontSize: 11, color: '#059669' }}>verified</span>
              Admin Operator
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}