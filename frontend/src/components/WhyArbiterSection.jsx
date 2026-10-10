import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArbiterLogo from './ArbiterLogo';
import Screw from './Screw';

const T = '#1ABC9C'; // Primary Phosphor Teal
const CYAN = '#00E5FF'; // Electric Cyan
const AMBER = '#F59E0B'; // Satin Gold / Amber
const RED = '#EF4444'; // Crimson Alert
const SLATE = '#64748B';

// Realistic mission-critical ticket records
const TICKETS = [
  {
    id: 'TIC-4921',
    label: 'Production Server 500 Outage',
    category: 'Infrastructure',
    reporter: 'dev-ops',
    time: '2m ago',
    type: 'urgent',
    severity: 'Critical',
    color: RED,
    action: 'Escalated to On-Call Engineer',
    route: 'human',
    confidence: '99.8%',
    resolutionTime: '< 45s SLA',
    description: 'Kubernetes ingress pods returning HTTP 502/500 across EU region.',
    mcpTool: 'None (Requires Incident Commander)',
  },
  {
    id: 'TIC-4918',
    label: 'Suspicious Admin Login Attempt',
    category: 'Security',
    reporter: 'audit-bot',
    time: '5m ago',
    type: 'urgent',
    severity: 'High',
    color: AMBER,
    action: 'Security Team Paged via Slack',
    route: 'human',
    confidence: '97.2%',
    resolutionTime: '< 60s SLA',
    description: 'Multiple failed MFA challenges from unauthorized IP block (203.0.113.4).',
    mcpTool: 'None (Requires Security Analyst Review)',
  },
  {
    id: 'TIC-4915',
    label: 'Global VPN Access Request',
    category: 'Network',
    reporter: 'sarah.m',
    time: '8m ago',
    type: 'routine',
    severity: 'Medium',
    color: T,
    action: 'Auto-resolved via WireGuard MCP',
    route: 'auto',
    confidence: '98.9%',
    resolutionTime: '0.8s execution',
    description: 'Verified employee requesting standard remote VPN configuration profile.',
    mcpTool: 'wireguard.provision_profile()',
  },
  {
    id: 'TIC-4912',
    label: 'SSO Password Reset',
    category: 'Identity',
    reporter: 'alex.k',
    time: '11m ago',
    type: 'routine',
    severity: 'Low',
    color: CYAN,
    action: 'Auto-resolved via Okta MCP',
    route: 'auto',
    confidence: '99.4%',
    resolutionTime: '0.4s execution',
    description: 'Automated self-service verification passed; temporary access link issued.',
    mcpTool: 'okta.reset_password_link()',
  },
  {
    id: 'TIC-4908',
    label: 'Office Wi-Fi Guest Credential',
    category: 'Office IT',
    reporter: 'reception',
    time: '14m ago',
    type: 'routine',
    severity: 'Low',
    color: T,
    action: 'Auto-resolved via Meraki MCP',
    route: 'auto',
    confidence: '99.1%',
    resolutionTime: '0.6s execution',
    description: 'Standard 24-hour visitor Wi-Fi pass generated for confirmed guest roster.',
    mcpTool: 'meraki.generate_guest_psk()',
  },
];

export default function WhyArbiterSection() {
  const [activeTicketId, setActiveTicketId] = useState(TICKETS[0].id);
  const [filter, setFilter] = useState('all'); // 'all' | 'auto' | 'human'
  const [isSimulating, setIsSimulating] = useState(true);

  // Auto-rotate simulation every 4.5 seconds
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setActiveTicketId(prev => {
        const idx = TICKETS.findIndex(t => t.id === prev);
        const nextIdx = (idx + 1) % TICKETS.length;
        return TICKETS[nextIdx].id;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [isSimulating]);

  const activeTicket = TICKETS.find(t => t.id === activeTicketId) || TICKETS[0];
  const filteredTickets = TICKETS.filter(t => filter === 'all' || t.route === filter);

  return (
    <section
      id="why-arbiter"
      style={{
        padding: '110px 24px',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid rgba(26,188,156,0.08)',
        background: 'linear-gradient(180deg, #050B09 0%, #08110E 50%, #050B09 100%)',
      }}
    >
      <style>{`
        @keyframes flow-laser-left {
          from { stroke-dashoffset: 60; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes flow-laser-right {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -60; }
        }
        .laser-left {
          stroke-dasharray: 8 6;
          animation: flow-laser-left 1.2s linear infinite;
        }
        .laser-right {
          stroke-dasharray: 8 6;
          animation: flow-laser-right 1.2s linear infinite;
        }
        @media (max-width: 1040px) {
          .why-arbiter-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .conduit-connector {
            display: none !important;
          }
        }
      `}</style>

      {/* Ambient background illumination */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 960,
          height: 520,
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(26,188,156,0.07) 0%, rgba(0,229,255,0.02) 40%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(26,188,156,0.06) 1px, transparent 1px), radial-gradient(rgba(243,156,18,0.03) 1px, transparent 1px)',
          backgroundSize: '36px 36px, 72px 72px',
          backgroundPosition: '0 0, 18px 18px',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 1220, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* ── Section Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 54 }}>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'linear-gradient(180deg, rgba(26,188,156,0.12) 0%, rgba(15,25,22,0.6) 100%)',
              border: '1px solid rgba(26,188,156,0.3)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.4)',
              marginBottom: 16,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: T,
                boxShadow: `0 0 10px ${T}`,
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#E2F8F3',
                fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
              }}
            >
              Tactical Triage Architecture
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(28px, 4.5vw, 48px)',
              fontWeight: 800,
              color: '#F0FDF9',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 16px 0',
              textShadow: '0 2px 20px rgba(0,0,0,0.8)',
            }}
          >
            Every day, the same tickets pile up.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(14px, 1.8vw, 17px)',
              color: '#94A3B8',
              lineHeight: 1.6,
              maxWidth: 700,
              margin: '0 auto',
            }}
          >
            Most are routine repetition. A few are critical outages. Without Arbiter, your team is buried in context switches — until it&apos;s too late.
          </motion.p>

          {/* Interactive Simulation Controls */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              marginTop: 28,
              flexWrap: 'wrap',
            }}
          >
            {/* Live stream button */}
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 15px',
                borderRadius: 8,
                background: isSimulating
                  ? 'linear-gradient(180deg, #182824 0%, #0F1A17 100%)'
                  : 'rgba(20,30,26,0.6)',
                border: `1px solid ${isSimulating ? 'rgba(26,188,156,0.45)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isSimulating
                  ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.5)'
                  : 'none',
                color: isSimulating ? '#5EEAD4' : '#64748B',
                fontFamily: "'Outfit', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isSimulating ? T : '#475569',
                  boxShadow: isSimulating ? `0 0 8px ${T}` : 'none',
                }}
              />
              {isSimulating ? 'LIVE INGESTION: STREAMING' : 'SIMULATION: PAUSED'}
            </button>

            {/* Filter buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 3,
                borderRadius: 9,
                background: '#09100D',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {[
                { id: 'all', label: 'All Tickets (5)' },
                { id: 'auto', label: 'Autonomous (3)', dot: T },
                { id: 'human', label: 'Escalated (2)', dot: AMBER },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 13px',
                    borderRadius: 6,
                    border: 'none',
                    background: filter === tab.id
                      ? 'linear-gradient(180deg, #23342E 0%, #172420 100%)'
                      : 'transparent',
                    color: filter === tab.id ? '#F0FDF9' : '#64748B',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: filter === tab.id
                      ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.4)'
                      : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.dot && (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: tab.dot,
                        boxShadow: filter === tab.id ? `0 0 6px ${tab.dot}` : 'none',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── THE 3-BAY TACTICAL CONSOLE (MAIN STAGE) ── */}
        <div
          style={{
            position: 'relative',
            borderRadius: 22,
            background: 'linear-gradient(180deg, #091310 0%, #060D0B 100%)',
            border: '1px solid rgba(26,188,156,0.22)',
            boxShadow: `
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              inset 0 -1px 0 rgba(0, 0, 0, 0.8),
              0 24px 64px -12px rgba(0, 0, 0, 0.85),
              0 0 40px rgba(26, 188, 156, 0.08)
            `,
            padding: '36px 30px',
          }}
        >
          {/* Hardware chassis screws at 4 corners */}
          <div style={{ position: 'absolute', top: 12, left: 12 }}><Screw size={10} angle={35} /></div>
          <div style={{ position: 'absolute', top: 12, right: 12 }}><Screw size={10} angle={125} /></div>
          <div style={{ position: 'absolute', bottom: 12, left: 12 }}><Screw size={10} angle={78} /></div>
          <div style={{ position: 'absolute', bottom: 12, right: 12 }}><Screw size={10} angle={160} /></div>

          {/* Top Chassis Telemetry Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 18px',
              borderRadius: 8,
              background: 'linear-gradient(180deg, #0C1814 0%, #08100E 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.04)',
              marginBottom: 28,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: '#64748B',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A7F3D0' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: T, boxShadow: `0 0 6px ${T}` }} />
                CHASSIS://ARBITER-CORE.01
              </span>
              <span>ENGINE: LANGGRAPH + GROQ/CLAUDE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span>AVG LATENCY: <strong style={{ color: '#E2F8F3' }}>28ms</strong></span>
              <span>TRIAGE ACCURACY: <strong style={{ color: T }}>99.4%</strong></span>
              <span>STATUS: <strong style={{ color: CYAN }}>ACTIVE CONDUIT STREAM</strong></span>
            </div>
          </div>

          {/* Main 3-Column Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 200px 1fr',
              gap: 20,
              alignItems: 'center',
            }}
            className="why-arbiter-grid"
          >
            {/* ═════════ LEFT COLUMN: RAW INCOMING QUEUE ═════════ */}
            <div
              style={{
                borderRadius: 14,
                background: 'linear-gradient(180deg, #08110E 0%, #050B09 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.03)',
                padding: '22px 20px',
                position: 'relative',
              }}
            >
              {/* Bay Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: AMBER,
                      fontFamily: "'Outfit', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: AMBER,
                        boxShadow: `0 0 8px ${AMBER}`,
                      }}
                    />
                    INCOMING TICKETS
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                    Every 10 min · Same Overload · Unranked
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#94A3B8',
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {filteredTickets.length} IN QUEUE
                </span>
              </div>

              {/* Stacked Tactile Ticket Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredTickets.map((t) => {
                  const isActive = t.id === activeTicket.id;
                  const isUrgent = t.type === 'urgent';
                  return (
                    <motion.div
                      key={t.id}
                      onClick={() => {
                        setActiveTicketId(t.id);
                        setIsSimulating(false);
                      }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 24 }}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 10,
                        padding: '12px 14px',
                        position: 'relative',
                        background: isActive
                          ? isUrgent
                            ? 'linear-gradient(180deg, #241408 0%, #180D05 100%)'
                            : 'linear-gradient(180deg, #142822 0%, #0D1C17 100%)'
                          : 'linear-gradient(180deg, #0F1D19 0%, #0A1411 100%)',
                        border: isActive
                          ? `1px solid ${isUrgent ? 'rgba(245,158,11,0.6)' : 'rgba(26,188,156,0.6)'}`
                          : '1px solid rgba(255,255,255,0.07)',
                        boxShadow: isActive
                          ? `
                            inset 0 1px 0 rgba(255,255,255,0.2),
                            inset 0 -1px 0 rgba(0,0,0,0.8),
                            0 8px 24px -4px ${isUrgent ? 'rgba(245,158,11,0.35)' : 'rgba(26,188,156,0.3)'}
                          `
                          : `
                            inset 0 1px 0 rgba(255,255,255,0.08),
                            inset 0 -1px 0 rgba(0,0,0,0.6),
                            0 4px 12px rgba(0,0,0,0.4)
                          `,
                        transition: 'border 0.2s, background 0.2s',
                      }}
                    >
                      {/* Specular top catch-light */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: '10%',
                          right: '10%',
                          height: 1,
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                          pointerEvents: 'none',
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: t.color,
                              boxShadow: `0 0 6px ${t.color}`,
                              display: 'inline-block',
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 10,
                              fontWeight: 700,
                              color: isUrgent ? '#FDE68A' : '#A7F3D0',
                            }}
                          >
                            {t.id}
                          </span>
                          <span style={{ fontSize: 10, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>· {t.category}</span>
                        </div>
                        <span style={{ fontSize: 10, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{t.time}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span
                          style={{
                            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: isActive ? '#FFFFFF' : '#CBD5E1',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {t.label}
                        </span>
                        {isUrgent ? (
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              letterSpacing: '0.06em',
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: 'rgba(239,68,68,0.2)',
                              border: '1px solid rgba(239,68,68,0.4)',
                              color: '#FCA5A5',
                              fontFamily: "'Outfit', sans-serif",
                              flexShrink: 0,
                            }}
                          >
                            CRITICAL
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: 'rgba(26,188,156,0.1)',
                              border: '1px solid rgba(26,188,156,0.2)',
                              color: '#5EEAD4',
                              fontFamily: "'Outfit', sans-serif",
                              flexShrink: 0,
                            }}
                          >
                            ROUTINE
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom Developer Stress Indicator */}
              <div
                style={{
                  marginTop: 14,
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: 'rgba(243,156,18,0.06)',
                  border: '1px solid rgba(243,156,18,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 11,
                  color: '#FBBF24',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span className="mso" style={{ fontSize: 16, color: AMBER }}>sentiment_dissatisfied</span>
                <span>Same tickets every day · <strong>High context-switch fatigue</strong></span>
              </div>
            </div>

            {/* ═════════ CENTER COLUMN: ARBITER AI REACTOR & CONDUIT ═════════ */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 18,
                position: 'relative',
                zIndex: 4,
                width: '100%',
              }}
            >
              {/* Orbital Particle Reactor */}
              <div style={{ position: 'relative', width: 130, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Outer Rotating Gyro Ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '1px dashed rgba(26,188,156,0.35)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Inner Counter-Rotating Ring with Nodes */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    inset: 8,
                    borderRadius: '50%',
                    border: '1px solid rgba(0,229,255,0.25)',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: CYAN,
                      boxShadow: `0 0 10px ${CYAN}`,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: AMBER,
                      boxShadow: `0 0 10px ${AMBER}`,
                    }}
                  />
                </motion.div>

                {/* Machined Gunmetal Bezel Core */}
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1A2824 0%, #0A1411 100%)',
                    border: '2px solid rgba(26,188,156,0.5)',
                    boxShadow: `
                      inset 0 2px 4px rgba(255,255,255,0.25),
                      inset 0 -2px 6px rgba(0,0,0,0.9),
                      0 0 35px rgba(26,188,156,0.35),
                      0 10px 24px rgba(0,0,0,0.8)
                    `,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <ArbiterLogo size={46} animate="gyro" />
                </div>
              </div>

              {/* Active Evaluation Telemetry Plaque */}
              <div
                style={{
                  width: '100%',
                  borderRadius: 10,
                  background: 'linear-gradient(180deg, #091512 0%, #050E0C 100%)',
                  border: '1px solid rgba(26,188,156,0.25)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.5)',
                  padding: '9px 10px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: T,
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: 3,
                  }}
                >
                  ● ANALYZING {activeTicket.id}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: '#F0FDF9',
                    fontFamily: "'Outfit', sans-serif",
                    letterSpacing: '-0.01em',
                  }}
                >
                  {activeTicket.route === 'auto' ? 'AUTONOMOUS ROUTE' : 'HUMAN ESCALATION'}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#64748B',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginTop: 2,
                  }}
                >
                  Confidence: <strong style={{ color: activeTicket.color }}>{activeTicket.confidence}</strong>
                </div>
              </div>

              {/* 3 Physical Actuator Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                {[
                  { icon: 'psychology', label: 'Understands context' },
                  { icon: 'balance', label: 'Classifies & ranks' },
                  { icon: 'bolt', label: 'Prepares next steps' },
                ].map((chip, i) => (
                  <div
                    key={chip.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '6px 10px',
                      borderRadius: 7,
                      background: 'linear-gradient(180deg, #101E1A 0%, #0A1411 100%)',
                      border: '1px solid rgba(26,188,156,0.18)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 5px rgba(0,0,0,0.4)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#E2F8F3',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    <span className="mso" style={{ fontSize: 13, color: i === 1 ? AMBER : T }}>
                      {chip.icon}
                    </span>
                    <span>{chip.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ═════════ RIGHT COLUMN: TRIAGE COMPLETE & ENRICHED STREAM ═════════ */}
            <div
              style={{
                borderRadius: 14,
                background: 'linear-gradient(180deg, #08110E 0%, #050B09 100%)',
                border: '1px solid rgba(26,188,156,0.22)',
                boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.03)',
                padding: '22px 20px',
                position: 'relative',
              }}
            >
              {/* Bay Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: T,
                      fontFamily: "'Outfit', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: T,
                        boxShadow: `0 0 8px ${T}`,
                      }}
                    />
                    TRIAGE COMPLETE
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                    Clear, Prioritised Queue · Zero Human Delay
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(26,188,156,0.1)',
                    border: '1px solid rgba(26,188,156,0.25)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  TRIAGED
                </span>
              </div>

              {/* Sorted Output Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredTickets.map(t => {
                  const isActive = t.id === activeTicket.id;
                  const isAuto = t.route === 'auto';
                  return (
                    <motion.div
                      key={t.id}
                      animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                      transition={{ duration: 0.4 }}
                      style={{
                        borderRadius: 10,
                        padding: '12px 14px',
                        position: 'relative',
                        background: isActive
                          ? isAuto
                            ? 'linear-gradient(180deg, #0E241E 0%, #071511 100%)'
                            : 'linear-gradient(180deg, #241408 0%, #150A04 100%)'
                          : 'linear-gradient(180deg, #0F1D19 0%, #091310 100%)',
                        border: isActive
                          ? `1px solid ${isAuto ? 'rgba(0,229,255,0.7)' : 'rgba(245,158,11,0.7)'}`
                          : '1px solid rgba(255,255,255,0.07)',
                        boxShadow: isActive
                          ? `
                            inset 0 1px 0 rgba(255,255,255,0.2),
                            inset 0 -1px 0 rgba(0,0,0,0.8),
                            0 8px 24px -4px ${isAuto ? 'rgba(0,229,255,0.3)' : 'rgba(245,158,11,0.35)'}
                          `
                          : `
                            inset 0 1px 0 rgba(255,255,255,0.08),
                            0 4px 12px rgba(0,0,0,0.4)
                          `,
                        transition: 'border 0.2s, background 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: '#FFFFFF',
                          }}
                        >
                          {t.label}
                        </span>
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: '0.06em',
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: isAuto ? 'rgba(0,229,255,0.12)' : 'rgba(239,68,68,0.15)',
                            border: `1px solid ${isAuto ? 'rgba(0,229,255,0.3)' : 'rgba(239,68,68,0.35)'}`,
                            color: isAuto ? CYAN : '#FCA5A5',
                            fontFamily: "'Outfit', sans-serif",
                          }}
                        >
                          {t.severity}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#A7F3D0' }}>
                          <span className="mso" style={{ fontSize: 13, color: isAuto ? T : AMBER }}>
                            {isAuto ? 'check_circle' : 'notifications_active'}
                          </span>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>{t.action}</span>
                        </div>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: '#64748B',
                          }}
                        >
                          {t.resolutionTime}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom Operational Plaque */}
              <div
                style={{
                  marginTop: 14,
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: 'rgba(26,188,156,0.08)',
                  border: '1px solid rgba(26,188,156,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 11,
                  color: '#A7F3D0',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span className="mso" style={{ fontSize: 16, color: T }}>trending_up</span>
                <span>Less noise. More focus. <strong style={{ color: T }}>A more efficient IT team.</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* ── DUAL PATH SKEUOMORPHIC MODULES ── */}
        <div
          style={{
            marginTop: 48,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          {/* Module 1: Routine & Autonomous Path */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -3 }}
            style={{
              padding: '28px 24px',
              borderRadius: 16,
              background: 'linear-gradient(180deg, #091512 0%, #060D0B 100%)',
              border: '1px solid rgba(26,188,156,0.25)',
              boxShadow: `
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                inset 0 -1px 0 rgba(0, 0, 0, 0.8),
                0 16px 36px -8px rgba(0, 0, 0, 0.6)
              `,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 12, right: 12 }}><Screw size={9} angle={50} /></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(26,188,156,0.25) 0%, rgba(26,188,156,0.05) 100%)',
                  border: '1px solid rgba(26,188,156,0.4)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="mso" style={{ fontSize: 22, color: T }}>check_circle</span>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#F0FDF9',
                    fontFamily: "'Outfit', sans-serif",
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Routine &amp; safe
                </h3>
                <div style={{ fontSize: 12, color: T, fontWeight: 700, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                  Handled instantly by Arbiter
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: '#94A3B8', lineHeight: 1.7, margin: '0 0 20px 0', fontFamily: "'Inter', sans-serif" }}>
              Password resets, Wi-Fi issues, standard access requests — resolved automatically with zero human intervention.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Fast', 'Consistent', 'Reliable'].map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(26,188,156,0.08)',
                    color: T,
                    border: '1px solid rgba(26,188,156,0.25)',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Module 2: High Impact & Human Escalation Path */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -3 }}
            style={{
              padding: '28px 24px',
              borderRadius: 16,
              background: 'linear-gradient(180deg, #161009 0%, #0D0804 100%)',
              border: '1px solid rgba(243,156,18,0.25)',
              boxShadow: `
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                inset 0 -1px 0 rgba(0, 0, 0, 0.8),
                0 16px 36px -8px rgba(0, 0, 0, 0.6)
              `,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 12, right: 12 }}><Screw size={9} angle={135} /></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(243,156,18,0.25) 0%, rgba(243,156,18,0.05) 100%)',
                  border: '1px solid rgba(243,156,18,0.4)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="mso" style={{ fontSize: 22, color: AMBER }}>person_raised_hand</span>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#F0FDF9',
                    fontFamily: "'Outfit', sans-serif",
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Uncertain or risky
                </h3>
                <div style={{ fontSize: 12, color: AMBER, fontWeight: 700, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                  Human decides — always
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: '#94A3B8', lineHeight: 1.7, margin: '0 0 20px 0', fontFamily: "'Inter', sans-serif" }}>
              Anything smelling like real risk — security events, data access, high-impact changes — routes to your team immediately, no exceptions.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Safe', 'Auditable', 'Transparent'].map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(243,156,18,0.08)',
                    color: AMBER,
                    border: '1px solid rgba(243,156,18,0.25)',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
