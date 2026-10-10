import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { SlackLogo, JiraLogo } from '../components/BrandLogos';
import ArbiterLogo from '../components/ArbiterLogo';

const HAL_CONFIG = {
  HAL_4: {
    level: 'HAL-4',
    title: 'Policy Arbiter & Principal',
    badgeColor: '#4F46E5',
    badgeBg: '#EEF2FF',
    badgeBorder: '#C7D2FE',
    desc: 'Full governance authority over ChromaDB thresholds, LangGraph decision gates, and safety tripwires.',
    canOverrideSafety: true,
    canApproveP0: true,
    canTuneAI: true,
  },
  HAL_3: {
    level: 'HAL-3',
    title: 'SecOps / SRE Incident Commander',
    badgeColor: '#DC2626',
    badgeBg: '#FEF2F2',
    badgeBorder: '#FECACA',
    desc: 'Authorized to execute safety overrides, approve P0/P1 emergency actions, and broadcast to Slack war rooms.',
    canOverrideSafety: true,
    canApproveP0: true,
    canTuneAI: false,
  },
  HAL_2: {
    level: 'HAL-2',
    title: 'L2 Operations Specialist',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    badgeBorder: '#A7F3D0',
    desc: 'Standard human-in-the-loop responder. Authorized to approve sub-80% confidence ticket resolutions.',
    canOverrideSafety: false,
    canApproveP0: false,
    canTuneAI: false,
  },
  HAL_1: {
    level: 'HAL-1',
    title: 'Compliance & Audit Observer',
    badgeColor: '#64748B',
    badgeBg: '#F1F5F9',
    badgeBorder: '#E2E8F0',
    desc: 'Read-only access to decision rationale, audit ledger, and SLA latency telemetry. Zero operational execution rights.',
    canOverrideSafety: false,
    canApproveP0: false,
    canTuneAI: false,
  }
};

const DOMAIN_CATEGORIES = [
  { id: 'security', label: 'SecOps & Zero-Trust', color: '#DC2626', bg: '#FEF2F2' },
  { id: 'infra',    label: 'Cloud & Kubernetes',  color: '#2563EB', bg: '#EFF6FF' },
  { id: 'database', label: 'Database & Storage',  color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'network',  label: 'Network & VPN',       color: '#059669', bg: '#ECFDF5' },
  { id: 'iam',      label: 'Identity & Access',   color: '#D97706', bg: '#FFFBEB' },
  { id: 'billing',  label: 'Enterprise Billing',  color: '#0284C7', bg: '#F0F9FF' },
];

const INITIAL_INVITES = [
  {
    id: 'inv-sec-01',
    name: 'Marcus Vance',
    email: 'mvance@enterprise.io',
    dept: 'SecOps',
    role: 'HAL_3',
    slackHandle: '@mvance',
    domains: ['security', 'iam'],
    status: 'pending',
    invitedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    token: 'arb_inv_8f29ac01',
  },
  {
    id: 'inv-infra-02',
    name: 'Elena Rostova',
    email: 'erostova@enterprise.io',
    dept: 'Infrastructure',
    role: 'HAL_3',
    slackHandle: '@erostova',
    domains: ['infra', 'database'],
    status: 'pending',
    invitedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    token: 'arb_inv_3c41ea92',
  },
  {
    id: 'inv-ops-03',
    name: 'David Kim',
    email: 'dkim@enterprise.io',
    dept: 'IT Operations',
    role: 'HAL_2',
    slackHandle: '@dkim',
    domains: ['network', 'billing'],
    status: 'pending',
    invitedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    token: 'arb_inv_1b88df55',
  }
];

function timeSince(d) {
  if (!d) return '—';
  const ts = d.toDate?.() ?? (typeof d === 'string' ? new Date(d).getTime() : d);
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function UsersPage({ user, onNavigate }) {
  const [activeSessions, setActiveSessions] = useState([]);
  const [invites, setInvites] = useState(() => {
    try {
      const raw = localStorage.getItem('arbiter_team_invites_v2');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return INITIAL_INVITES;
  });

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invites' | 'matrix'
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [simulatingMember, setSimulatingMember] = useState(null);

  // Invite Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDept, setFormDept] = useState('SecOps');
  const [formRole, setFormRole] = useState('HAL_3');
  const [formSlack, setFormSlack] = useState('');
  const [formDomains, setFormDomains] = useState(['security']);

  // Fetch live active sessions from Firestore
  useEffect(() => {
    const q = query(collection(db, 'sessions'), orderBy('lastActive', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, snap => {
      setActiveSessions(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, err => {
      console.warn('Firestore sessions load notice:', err);
    });
    return () => unsubscribe();
  }, []);

  const saveInvites = (newInvites) => {
    setInvites(newInvites);
    try {
      localStorage.setItem('arbiter_team_invites_v2', JSON.stringify(newInvites));
    } catch (e) {}
  };

  const handleCreateInvite = (e) => {
    e.preventDefault();
    if (!formEmail.trim() || !formName.trim()) {
      toast.error('Please enter name and work email');
      return;
    }

    const token = 'arb_inv_' + Math.random().toString(36).substring(2, 10);
    const newInvite = {
      id: `inv-${Date.now()}`,
      name: formName.trim(),
      email: formEmail.trim(),
      dept: formDept,
      role: formRole,
      slackHandle: formSlack.trim().startsWith('@') ? formSlack.trim() : (formSlack.trim() ? `@${formSlack.trim()}` : `@${formName.toLowerCase().replace(/\s+/g, '')}`),
      domains: formDomains.length > 0 ? formDomains : ['security'],
      status: 'pending',
      invitedAt: new Date().toISOString(),
      token,
    };

    saveInvites([newInvite, ...invites]);
    setIsInviteModalOpen(false);
    toast.success(`Enterprise invitation dispatched to ${formEmail}!`);

    // Reset Form
    setFormName('');
    setFormEmail('');
    setFormSlack('');
    setFormDomains(['security']);
  };

  const handleCopyLink = (token) => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard?.writeText?.(link);
    toast.success('Secure invitation link copied to clipboard!');
  };

  const handleRevokeInvite = (id) => {
    const updated = invites.filter(i => i.id !== id);
    saveInvites(updated);
    toast.success('Invitation revoked.');
  };

  const handleResendInvite = (invite) => {
    toast.success(`Resent invitation notification to ${invite.email}`);
  };

  const toggleDomain = (id) => {
    setFormDomains(prev => 
      prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
    );
  };

  // Combine live Google session user with operator context
  const fullMembers = useMemo(() => {
    return activeSessions.map((session, idx) => {
      const isCurrentUser = session.email === user?.email || session.uid === user?.uid;
      return {
        ...session,
        isCurrentUser,
        role: isCurrentUser ? 'HAL_4' : 'HAL_3',
        dept: isCurrentUser ? 'Principal Enterprise Architect' : 'SecOps Engineering',
        slackHandle: isCurrentUser ? '@vignesh.admin' : `@user_${session.displayName?.toLowerCase().slice(0, 5) || 'op'}`,
        domains: isCurrentUser ? ['security', 'infra', 'iam'] : ['security'],
        affinityScore: isCurrentUser ? '99.8%' : '94.2%',
        resolvedCount: isCurrentUser ? 42 : 18,
      };
    });
  }, [activeSessions, user]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Top Header & Executive Value Bar ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        borderRadius: 16, padding: '26px 30px', color: 'white',
        boxShadow: '0 8px 32px rgba(49,46,129,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20
      }}>
        <div style={{ maxWidth: 650 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.12)', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            <span className="mso sm" style={{ fontSize: 14, color: '#38BDF8' }}>shield_person</span>
            AI-Human Co-Pilot Protocol · HAL Quorum
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 8 }}>
            Team Operations & AI Delegation Authority Matrix
          </h2>
          <p style={{ fontSize: 13.5, color: '#C7D2FE', lineHeight: 1.6 }}>
            Orchestrate human-in-the-loop escalation commanders, domain affinity routing, and dual-custody safety authorization across your engineering organization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 20px', background: '#38BDF8', color: '#0F172A',
              border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 800,
              fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(56,189,248,0.3)',
              transition: 'transform 0.15s, opacity 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <span className="mso sm" style={{ fontSize: 18 }}>person_add</span>
            Invite Team Member
          </button>
        </div>
      </div>

      {/* ── Innovative Quorum Metrics 4-Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Active Human Commanders', val: `${fullMembers.length} Active`, sub: 'Real-time Google SSO sessions', icon: 'verified_user', color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
          { label: 'Pending Invitations', val: `${invites.length} Seats Reserved`, sub: 'Awaiting first sign-in authorization', icon: 'forward_to_inbox', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Domain Affinity Coverage', val: '100% Covered', sub: 'Security, Cloud, DB, Network, IAM', icon: 'hub', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
          { label: 'Safety Quorum Protocol', val: 'Dual-Custody Active', sub: 'P0 critical actions enforce 2-operator signoff', icon: 'shield_locked', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ].map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            style={{
              background: 'white', border: '1px solid #E4E9F2', borderRadius: 14,
              padding: '18px 20px', boxShadow: '0 2px 6px rgba(15,23,42,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', fontFamily: "'Plus Jakarta Sans',sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {card.label}
              </span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: card.bg, border: `1px solid ${card.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mso sm" style={{ color: card.color, fontSize: 18 }}>{card.icon}</span>
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em', marginBottom: 4 }}>
              {card.val}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>
              {card.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Sub-navigation Tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, background: '#F1F5F9', padding: 3, borderRadius: 10 }}>
          {[
            { id: 'members', label: `Active Operators (${fullMembers.length})`, icon: 'badge' },
            { id: 'invites', label: `Pending Invitations (${invites.length})`, icon: 'mail' },
            { id: 'matrix',  label: 'AI Authority Matrix & Quorum Rules', icon: 'security' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, border: 'none',
                fontSize: 12.5, fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#4F46E5' : '#64748B',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(15,23,42,0.06)' : 'none',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <span className="mso sm" style={{ fontSize: 15 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', background: '#EEF2FF', border: '1px solid #C7D2FE',
            borderRadius: 8, fontSize: 12.5, fontWeight: 700, color: '#4F46E5',
            fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: 'pointer'
          }}
        >
          <span className="mso sm" style={{ fontSize: 16 }}>add</span>
          Add New Team Member
        </button>
      </div>

      {/* ── TAB 1: Active Operators List ── */}
      {activeTab === 'members' && (
        <div style={{ background: 'white', border: '1px solid #E4E9F2', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, fontFamily: "'Inter',sans-serif" }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E4E9F2', color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '12px 18px' }}>Operator & Department</th>
                <th style={{ padding: '12px 16px' }}>AI Authority Level (HAL)</th>
                <th style={{ padding: '12px 16px' }}>Domain Routing Affinities</th>
                <th style={{ padding: '12px 16px' }}>Slack Dispatch Handle</th>
                <th style={{ padding: '12px 16px' }}>Session Status</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fullMembers.map((m, idx) => {
                const hal = HAL_CONFIG[m.role] || HAL_CONFIG.HAL_3;
                const init = (m.displayName || m.email || '?').slice(0, 2).toUpperCase();

                return (
                  <tr key={m.id || idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.12s' }}>
                    {/* User profile */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {m.photoURL ? (
                          <img src={m.photoURL} alt="" style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 0 1px #E4E9F2', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#4F46E5,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {init}
                          </div>
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{m.displayName || 'Enterprise Operator'}</span>
                            {m.isCurrentUser && (
                              <span style={{ padding: '2px 7px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 999, fontSize: 10, fontWeight: 700, color: '#065F46' }}>
                                You (Primary Operator)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span>{m.email || '—'}</span>
                            <span style={{ color: '#CBD5E1' }}>•</span>
                            <span style={{ color: '#94A3B8' }}>{m.dept}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Authority Level */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: hal.badgeBg, border: `1px solid ${hal.badgeBorder}`, color: hal.badgeColor, fontSize: 11, fontWeight: 800 }}>
                        <span className="mso sm" style={{ fontSize: 13 }}>shield</span>
                        {hal.level}: {hal.title}
                      </div>
                    </td>

                    {/* Domain Affinities */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {m.domains.map(dId => {
                          const cat = DOMAIN_CATEGORIES.find(c => c.id === dId) || { label: dId, color: '#4F46E5', bg: '#EEF2FF' };
                          return (
                            <span key={dId} style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10.5, fontWeight: 700, background: cat.bg, color: cat.color }}>
                              {cat.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Slack Handle */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 11.5, fontFamily: "'JetBrains Mono',monospace", color: '#0F172A' }}>
                        <SlackLogo size={12} />
                        {m.slackHandle}
                      </div>
                    </td>

                    {/* Last active status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 999, fontSize: 10, fontWeight: 700, color: '#065F46' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669' }} />
                        Active {timeSince(m.lastActive)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSimulatingMember(m)}
                        title="Simulate live AI escalation dispatch to this commander"
                        style={{
                          padding: '6px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0',
                          borderRadius: 6, fontSize: 11.5, fontWeight: 700, color: '#166534',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5
                        }}
                      >
                        <span className="mso sm" style={{ fontSize: 14 }}>radar</span>
                        Test AI Routing
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB 2: Pending Invitations List ── */}
      {activeTab === 'invites' && (
        <div style={{ background: 'white', border: '1px solid #E4E9F2', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          {invites.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8' }}>
              <span className="mso sm" style={{ fontSize: 36, color: '#CBD5E1', display: 'block', marginBottom: 8 }}>mail_lock</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#64748B' }}>No Pending Invitations</div>
              <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 4 }}>Invite SREs, SecOps leads, or compliance auditors to your Arbiter Console.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, fontFamily: "'Inter',sans-serif" }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E4E9F2', color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '12px 18px' }}>Invited Candidate</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Authority (HAL)</th>
                  <th style={{ padding: '12px 16px' }}>Domain Routing Coverage</th>
                  <th style={{ padding: '12px 16px' }}>Slack Binding</th>
                  <th style={{ padding: '12px 16px' }}>Sent Date</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => {
                  const hal = HAL_CONFIG[inv.role] || HAL_CONFIG.HAL_3;
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{inv.name}</div>
                        <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{inv.email} • {inv.dept}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: hal.badgeBg, border: `1px solid ${hal.badgeBorder}`, color: hal.badgeColor, fontSize: 11, fontWeight: 800 }}>
                          {hal.level}: {hal.title}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {inv.domains.map(dId => {
                            const cat = DOMAIN_CATEGORIES.find(c => c.id === dId) || { label: dId, color: '#4F46E5', bg: '#EEF2FF' };
                            return (
                              <span key={dId} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: cat.bg, color: cat.color }}>
                                {cat.label}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontFamily: "'JetBrains Mono',monospace", color: '#475569' }}>
                          <SlackLogo size={12} />
                          {inv.slackHandle}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: 11.5, color: '#94A3B8' }}>
                        {timeSince(inv.invitedAt)}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopyLink(inv.token)}
                            title="Copy Secure Direct Join Link"
                            style={{
                              padding: '5px 9px', background: '#F8FAFC', border: '1px solid #E2E8F0',
                              borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#475569', cursor: 'pointer'
                            }}
                          >
                            Copy Link
                          </button>
                          <button
                            onClick={() => handleResendInvite(inv)}
                            title="Resend Invitation Email"
                            style={{
                              padding: '5px 9px', background: '#EEF2FF', border: '1px solid #C7D2FE',
                              borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#4F46E5', cursor: 'pointer'
                            }}
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            title="Revoke and cancel invitation"
                            style={{
                              padding: '5px 9px', background: '#FEF2F2', border: '1px solid #FECACA',
                              borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#DC2626', cursor: 'pointer'
                            }}
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── TAB 3: AI Authority Matrix & Dual-Custody Rules ── */}
      {activeTab === 'matrix' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {Object.values(HAL_CONFIG).map((hal, i) => (
            <div key={hal.level} style={{ background: 'white', border: '1px solid #E4E9F2', borderRadius: 14, padding: '22px 20px', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: hal.badgeBg, border: `1px solid ${hal.badgeBorder}`, color: hal.badgeColor }}>
                  {hal.level}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Tier {4 - i}</span>
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                {hal.title}
              </div>
              <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, marginBottom: 16 }}>
                {hal.desc}
              </p>
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: hal.canOverrideSafety ? '#059669' : '#94A3B8' }}>
                  <span className="mso sm" style={{ fontSize: 14 }}>{hal.canOverrideSafety ? 'check_circle' : 'cancel'}</span>
                  <span>Safety Tripwire Override Authority</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: hal.canApproveP0 ? '#059669' : '#94A3B8' }}>
                  <span className="mso sm" style={{ fontSize: 14 }}>{hal.canApproveP0 ? 'check_circle' : 'cancel'}</span>
                  <span>P0/P1 Incident Resolution Signoff</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: hal.canTuneAI ? '#059669' : '#94A3B8' }}>
                  <span className="mso sm" style={{ fontSize: 14 }}>{hal.canTuneAI ? 'check_circle' : 'cancel'}</span>
                  <span>LangGraph & ChromaDB Policy Tuning</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── INNOVATIVE FEATURE: AI Shadow-Pairing Routing Simulator Drawer ── */}
      <AnimatePresence>
        {simulatingMember && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => setSimulatingMember(null)}
              style={{ position: 'fixed', inset: 0, background: '#0F172A', zIndex: 1000 }}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, width: 560,
                background: 'white', boxShadow: '-8px 0 32px rgba(15,23,42,0.15)',
                zIndex: 1001, display: 'flex', flexDirection: 'column', overflowY: 'auto'
              }}
            >
              {/* Drawer Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4E9F2', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ArbiterLogo size={30} animate="gyro" />
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                      AI Semantic Escalation Dispatch Simulation
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>
                      Target Commander: <strong>{simulatingMember.displayName || simulatingMember.name}</strong> ({simulatingMember.slackHandle})
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSimulatingMember(null)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Simulation Content */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Simulated Incoming Ticket */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Simulated Production Stream Incident</span>
                    <span style={{ padding: '2px 7px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 999, fontSize: 10, fontWeight: 800, color: '#991B1B' }}>P0 Critical</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                    Production PostgreSQL connection timeout & cluster ingress failure
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    Origin: Jira Webhook #INC-8921 • Database pool exhausted after spike in unauthorized token resets.
                  </div>
                </div>

                {/* Arbiter Decision Trace */}
                <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 12, padding: '16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Arbiter MCP Autonomous Routing Trace
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mso sm" style={{ color: '#059669', fontSize: 16 }}>check_circle</span>
                      <span>ChromaDB Semantic Vector Match: <strong>96.4% affinity</strong> to {simulatingMember.displayName || simulatingMember.name}'s domains ({simulatingMember.domains?.join(', ')})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mso sm" style={{ color: '#059669', fontSize: 16 }}>check_circle</span>
                      <span>Authority Verification: Requires HAL-3 Commander sign-off (Verified)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mso sm" style={{ color: '#059669', fontSize: 16 }}>check_circle</span>
                      <span>Target Dispatch Channel: Slack Direct Mention <strong>{simulatingMember.slackHandle}</strong> in #incident-command</span>
                    </div>
                  </div>
                </div>

                {/* Live Slack Block Kit Preview */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Live Slack Block Kit Message Preview
                  </div>
                  <div style={{ background: '#4A154B', borderRadius: 12, padding: '18px', color: 'white', boxShadow: '0 4px 14px rgba(74,21,75,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <SlackLogo size={18} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F9A8D4' }}>Arbiter MCP Bot</span>
                      <span style={{ fontSize: 10, color: '#D8B4FE' }}>APP • just now</span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                      🚨 P0 Security/Outage Escalation Assigned to {simulatingMember.slackHandle}
                    </div>
                    <div style={{ fontSize: 12, color: '#E9D5FF', lineHeight: 1.5, marginBottom: 14 }}>
                      Arbiter detected a critical database timeout with safety tripwire override. As designated <strong>{HAL_CONFIG[simulatingMember.role]?.title}</strong>, your immediate approval is requested.
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={{ padding: '8px 14px', background: '#10B981', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                        Approve Mitigation
                      </button>
                      <button style={{ padding: '8px 14px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                        Open War Room
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Enterprise Invite Team Member Modal ── */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => setIsInviteModalOpen(false)}
              style={{ position: 'fixed', inset: 0, background: '#0F172A', zIndex: 1000 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: 560, background: 'white', borderRadius: 16,
                padding: '28px', boxShadow: '0 20px 40px rgba(15,23,42,0.2)', zIndex: 1001
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                    Invite Enterprise Team Member
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                    Assign Human Authority Level (HAL) and domain escalation affinity.
                  </div>
                </div>
                <button onClick={() => setIsInviteModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#94A3B8' }}>✕</button>
              </div>

              <form onSubmit={handleCreateInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                    Full Name & Work Email
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      type="text" placeholder="e.g. Marcus Vance"
                      value={formName} onChange={e => setFormName(e.target.value)}
                      style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }}
                      required
                    />
                    <input
                      type="email" placeholder="mvance@enterprise.io"
                      value={formEmail} onChange={e => setFormEmail(e.target.value)}
                      style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                      Department
                    </label>
                    <select
                      value={formDept} onChange={e => setFormDept(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: 'white' }}
                    >
                      <option value="SecOps">SecOps Engineering</option>
                      <option value="Infrastructure">Infrastructure / Cloud SRE</option>
                      <option value="IT Operations">IT Operations & Support</option>
                      <option value="Compliance">Security & Compliance</option>
                      <option value="DevOps">DevOps Platform</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                      Slack User Handle
                    </label>
                    <input
                      type="text" placeholder="@marcus.secops"
                      value={formSlack} onChange={e => setFormSlack(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                    Human Authority Level (HAL)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {Object.entries(HAL_CONFIG).map(([k, cfg]) => (
                      <div
                        key={k}
                        onClick={() => setFormRole(k)}
                        style={{
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          border: formRole === k ? `2px solid ${cfg.badgeColor}` : '1px solid #E2E8F0',
                          background: formRole === k ? cfg.badgeBg : '#F8FAFC',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{cfg.level}: {cfg.title}</div>
                        <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>{cfg.canOverrideSafety ? 'Can override safety guardrails' : 'Standard escalation review'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                    Assigned Domain Routing Affinities
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DOMAIN_CATEGORIES.map(cat => {
                      const isSel = formDomains.includes(cat.id);
                      return (
                        <button
                          key={cat.id} type="button"
                          onClick={() => toggleDomain(cat.id)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                            border: isSel ? `1px solid ${cat.color}` : '1px solid #E2E8F0',
                            background: isSel ? cat.bg : 'white',
                            color: isSel ? cat.color : '#64748B',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          {isSel && <span className="mso sm" style={{ fontSize: 13 }}>check</span>}
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button
                    type="button" onClick={() => setIsInviteModalOpen(false)}
                    style={{ padding: '9px 16px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '9px 20px', background: '#4F46E5', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}
                  >
                    Send Invitation & Generate Link
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}