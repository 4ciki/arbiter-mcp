import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Bell, ChevronDown, ChevronUp,
  User, Settings, LogOut, Loader2,
} from 'lucide-react';
import ArbiterLogo from './ArbiterLogo';

function StatusDot({ label, status = 'online' }) {
  const c = {
    online:  { dot: '#10B981', ring: '#D1FAE5', text: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
    active:  { dot: '#6366F1', ring: '#E0E7FF', text: '#3730A3', bg: '#EEF2FF', border: '#C7D2FE' },
    warning: { dot: '#F59E0B', ring: '#FEF3C7', text: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  }[status];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 7px',
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 999, fontSize: 11, fontWeight: 600, color: c.text,
      fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: 'nowrap',
    }}>
      <span style={{ position: 'relative', width: 7, height: 7, flexShrink: 0 }}>
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: c.dot, opacity: 0.3,
          animation: 'icon-ping 1.8s ease-out infinite',
        }} />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: c.dot,
        }} />
      </span>
      {label}
    </div>
  );
}

export default function Header({ user, signOut }) {
  const [menuOpen, setMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const fn = e => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    setMenu(false);
    await signOut();
  };

  const iconBtn = {
    width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: '1px solid transparent',
    borderRadius: 9, cursor: 'pointer', color: '#94A3B8', transition: 'all 0.14s',
  };

  return (
    <header style={{
      height: 58, flexShrink: 0,
      display: 'flex', alignItems: 'center',
      background: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      padding: '0 20px 0 16px',
      position: 'relative', zIndex: 200,
      gap: 16,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
        <ArbiterLogo size={28} animate="gyro" />
        <div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 14, fontWeight: 800, color: '#0F172A',
            letterSpacing: '-0.02em', lineHeight: 1,
          }}>Arbiter MCP</div>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#94A3B8', lineHeight: 1, marginTop: 2,
          }}>AI Operations Console</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 26, background: '#F1F5F9', flexShrink: 0 }} />

      {/* Status chips */}
      <div style={{ display: 'flex', gap: 6, flex: 1 }}>
        <StatusDot label="MCP Server" status="online" />
        <StatusDot label="AI Engine"  status="active" />
        <StatusDot label="Database"   status="online" />
      </div>

      {/* Right side actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* Refresh */}
        <button
          onClick={() => location.reload()}
          title="Refresh"
          style={iconBtn}
          onMouseEnter={e => { e.currentTarget.style.background='#F8FAFC'; e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#475569'; }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.color='#94A3B8'; }}
        >
          <RefreshCw size={16} />
        </button>

        {/* Notification bell */}
        <button
          title="Notifications"
          style={{ ...iconBtn, position: 'relative' }}
          onMouseEnter={e => { e.currentTarget.style.background='#F8FAFC'; e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#475569'; }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.color='#94A3B8'; }}
        >
          <Bell size={16} />
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 7, height: 7, borderRadius: '50%',
            background: '#EF4444', border: '1.5px solid white',
          }} />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 26, background: '#F1F5F9', flexShrink: 0, margin: '0 2px' }} />

        {/* User menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenu(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px 5px 5px',
              background: menuOpen ? '#F8FAFC' : 'transparent',
              border: `1px solid ${menuOpen ? '#E2E8F0' : 'transparent'}`,
              borderRadius: 999, cursor: 'pointer', transition: 'all 0.14s',
            }}
            onMouseEnter={e => { if (!menuOpen) { e.currentTarget.style.background='#F8FAFC'; e.currentTarget.style.borderColor='#E2E8F0'; }}}
            onMouseLeave={e => { if (!menuOpen) { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; }}}
          >
            {user.photoURL
              ? <img src={user.photoURL} alt="" style={{
                  width: 27, height: 27, borderRadius: '50%',
                  border: '2px solid white', boxShadow: '0 0 0 1.5px #E2E8F0',
                }} />
              : <div style={{
                  width: 27, height: 27, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#4F46E5,#818CF8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'white',
                }}>
                  {(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}
                </div>
            }
            <span style={{
              fontSize: 13, fontWeight: 600, color: '#1E293B',
              fontFamily: "'Inter',sans-serif", maxWidth: 120,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user.displayName?.split(' ')[0] || user.email}
            </span>
            {menuOpen ? <ChevronUp size={14} color="#94A3B8" /> : <ChevronDown size={14} color="#94A3B8" />}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'white', border: '1px solid #E2E8F0', borderRadius: 14,
                  padding: 6, boxShadow: '0 16px 48px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)',
                  minWidth: 220, zIndex: 1000,
                }}
              >
                {/* User info */}
                <div style={{ padding: '10px 12px 10px', marginBottom: 2 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: '#0F172A',
                    fontFamily: "'Inter',sans-serif",
                  }}>{user.displayName}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{user.email}</div>
                </div>

                <div style={{ height: 1, background: '#F1F5F9', margin: '0 6px 6px' }} />

                {/* Menu items */}
                {[
                  { Icon: User,     label: 'Profile',     action: null },
                  { Icon: Settings, label: 'Preferences', action: null },
                ].map(item => (
                  <button key={item.label} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 12px', background: 'transparent', border: 'none',
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334155',
                    fontFamily: "'Inter',sans-serif", textAlign: 'left', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <item.Icon size={15} color="#94A3B8" />
                    {item.label}
                  </button>
                ))}

                <div style={{ height: 1, background: '#F1F5F9', margin: '6px 6px' }} />

                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 12px', background: 'transparent', border: 'none',
                    borderRadius: 8, cursor: signingOut ? 'not-allowed' : 'pointer',
                    fontSize: 13, color: '#DC2626', fontFamily: "'Inter',sans-serif",
                    textAlign: 'left', transition: 'background 0.12s',
                    opacity: signingOut ? 0.6 : 1,
                  }}
                  onMouseEnter={e => { if (!signingOut) e.currentTarget.style.background='#FEF2F2'; }}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  {signingOut
                    ? <Loader2 size={15} color="#DC2626" style={{ animation: 'spin 0.9s linear infinite' }} />
                    : <LogOut size={15} color="#DC2626" />
                  }
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}