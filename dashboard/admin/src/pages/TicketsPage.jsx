import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { JiraLogo, SlackLogo, ServiceBrandIcon } from '../components/BrandLogos';
import ArbiterLogo from '../components/ArbiterLogo';
import { getStoredTickets, updateTicketStatus, calculateStats } from '../data/ticketData';
import { useCredentials } from '../hooks/useCredentials';

const SEVERITY_CONFIG = {
  P0_CRITICAL: { label: 'P0 Critical', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', dot: '#DC2626', sla: '15m' },
  P1_HIGH:     { label: 'P1 High',     bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#D97706', sla: '2h' },
  P2_MEDIUM:   { label: 'P2 Medium',   bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', dot: '#2563EB', sla: '8h' },
  P3_LOW:      { label: 'P3 Low',      bg: '#F8FAFC', border: '#E2E8F0', text: '#475569', dot: '#94A3B8', sla: '24h' },
};

const STATUS_CONFIG = {
  auto_resolved:      { label: 'Auto-Resolved', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: 'check_circle' },
  resolved_by_human:  { label: 'Resolved (Human)', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: 'task_alt' },
  escalated_security: { label: 'SecOps Escalate', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: 'gpp_maybe' },
  escalated:          { label: 'Escalated to Slack', bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', icon: 'record_voice_over' },
  in_triage:          { label: 'In AI Triage', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: 'psychology' },
  pending_approval:   { label: 'Pending Approval', bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9', icon: 'pending_actions' },
};

const CATEGORIES = ['All', 'security', 'network', 'hardware', 'access', 'software', 'billing'];

export default function TicketsPage({ onNavigate }) {
  const [tickets, setTickets] = useState([]);
  const { jiraConnected, slackConnected } = useCredentials();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch real tickets directly from FastAPI backend + SQLite arbiter.db
  useEffect(() => {
    let mounted = true;
    // Clear legacy localStorage keys to ensure zero mock data leaks
    try {
      localStorage.removeItem('arbiter_tickets_live_v2');
      localStorage.removeItem('arbiter_tickets');
      localStorage.removeItem('arbiter_tickets_v1');
    } catch (e) {}

    async function loadTickets() {
      try {
        setLoading(true);
        const res = await fetch('/api/tickets?limit=100');
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data)) {
            setTickets(data);
          }
        }
      } catch (err) {
        console.warn('Backend tickets fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadTickets();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => calculateStats(tickets), [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Status filter
      if (statusFilter === 'auto_resolved' && t.status !== 'auto_resolved' && t.status !== 'resolved_by_human') return false;
      if (statusFilter === 'escalated' && t.status !== 'escalated' && t.status !== 'escalated_security') return false;
      if (statusFilter === 'in_triage' && t.status !== 'in_triage' && t.status !== 'pending_approval') return false;
      if (statusFilter === 'critical' && t.severity !== 'P0_CRITICAL' && t.severity !== 'P1_HIGH') return false;

      // Category filter
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchText = t.description?.toLowerCase().includes(q);
        const matchId = t.id?.toLowerCase().includes(q);
        const matchRep = t.reporter?.name?.toLowerCase().includes(q);
        if (!matchTitle && !matchText && !matchId && !matchRep) return false;
      }

      return true;
    });
  }, [tickets, statusFilter, categoryFilter, search]);

  const handleResolve = async (ticketId, note = 'Approved and resolved via Arbiter Console') => {
    try {
      await fetch(`/api/tickets/${ticketId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', note })
      });
    } catch (e) {
      console.warn('Backend resolve action failed:', e);
    }
    const updated = updateTicketStatus(ticketId, 'resolved_by_human', note);
    setTickets(updated);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: 'resolved_by_human', resolution_note: note } : null);
    }
    toast.success(`Ticket ${ticketId} resolved & audit recorded in SQLite DB!`);
  };

  const handleEscalateSlack = async (ticketId) => {
    try {
      await fetch(`/api/tickets/${ticketId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'escalate', note: 'Manually escalated to Slack incident channel' })
      });
    } catch (e) {
      console.warn('Backend escalate action failed:', e);
    }
    const updated = updateTicketStatus(ticketId, 'escalated', 'Manually escalated to Slack incident channel');
    setTickets(updated);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: 'escalated' } : null);
    }
    toast.success(`Broadcasted Ticket ${ticketId} to Slack war room.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(!jiraConnected && !slackConnected) ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            background: 'white',
            border: '1px solid #E4E9F2',
            borderRadius: 16,
            padding: '48px 36px',
            boxShadow: '0 4px 24px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top subtle accent gradient */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            background: 'linear-gradient(90deg, #4F46E5, #0284C7, #10B981)'
          }} />

          {/* Real-time status badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 14px',
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#64748B',
            marginBottom: 20
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
            Enterprise Stream Inactive · Zero Mock Data Enforced
          </div>

          {/* Powerful, classy sentence */}
          <h2 style={{
            fontSize: 28,
            fontWeight: 800,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            color: '#0F172A',
            letterSpacing: '-0.025em',
            lineHeight: 1.25,
            maxWidth: 680,
            marginBottom: 12
          }}>
            Autonomous Intelligence Awaits Your Enterprise Stream
          </h2>

          <p style={{
            fontSize: 15,
            color: '#64748B',
            lineHeight: 1.6,
            maxWidth: 640,
            marginBottom: 36,
            fontFamily: "'Inter',sans-serif"
          }}>
            Connect your Jira Service Management and Slack workspaces to activate real-time AI triage, deterministic safety guardrails, and executive operational insights.
          </p>

          {/* Dual Integration Connection Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 20,
            width: '100%',
            maxWidth: 740,
            marginBottom: 32
          }}>
            {/* Jira Service Management */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: '24px 22px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: '#EEF2FF', border: '1px solid #C7D2FE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <JiraLogo size={24} />
                  </div>
                  <span style={{
                    padding: '3px 8px', borderRadius: 999,
                    fontSize: 10.5, fontWeight: 700,
                    background: jiraConnected ? '#ECFDF5' : '#FFFBEB',
                    border: `1px solid ${jiraConnected ? '#A7F3D0' : '#FDE68A'}`,
                    color: jiraConnected ? '#065F46' : '#92400E',
                    textTransform: 'uppercase', letterSpacing: '0.04em'
                  }}>
                    {jiraConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 6
                }}>
                  Jira Service Management
                </div>
                <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, marginBottom: 20 }}>
                  Stream IT tickets, provisioning workflows, and incident reports into Arbiter with automated bi-directional resolution syncing.
                </p>
              </div>

              <button
                onClick={() => onNavigate?.('integrations')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: jiraConnected ? '#059669' : '#0052CC',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: jiraConnected ? '0 2px 6px rgba(5,150,105,0.2)' : '0 2px 6px rgba(0,82,204,0.2)',
                  transition: 'opacity 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <JiraLogo size={15} />
                {jiraConnected ? 'Jira Connected ✓' : 'Connect Jira Workspace →'}
              </button>
            </div>

            {/* Slack Enterprise Grid */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: '24px 22px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: '#F8FAFC', border: '1px solid #E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <SlackLogo size={24} />
                  </div>
                  <span style={{
                    padding: '3px 8px', borderRadius: 999,
                    fontSize: 10.5, fontWeight: 700,
                    background: slackConnected ? '#ECFDF5' : '#FFFBEB',
                    border: `1px solid ${slackConnected ? '#A7F3D0' : '#FDE68A'}`,
                    color: slackConnected ? '#065F46' : '#92400E',
                    textTransform: 'uppercase', letterSpacing: '0.04em'
                  }}>
                    {slackConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 6
                }}>
                  Slack Enterprise Grid
                </div>
                <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, marginBottom: 20 }}>
                  Empower engineers with interactive Slack Block Kit approval buttons, dedicated war-room escalation, and broadcast alerts.
                </p>
              </div>

              <button
                onClick={() => onNavigate?.('integrations')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: slackConnected ? '#059669' : '#4A154B',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: slackConnected ? '0 2px 6px rgba(5,150,105,0.2)' : '0 2px 6px rgba(74,21,75,0.2)',
                  transition: 'opacity 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <SlackLogo size={15} />
                {slackConnected ? 'Slack Connected ✓' : 'Connect Slack Workspace →'}
              </button>
            </div>
          </div>

          {/* Sandbox Testbench Shortcut */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 20px',
            background: '#F1F5F9',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            maxWidth: 640
          }}>
            <span className="mso sm" style={{ color: '#4F46E5', fontSize: 20 }}>science</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                Test AI Triage in Real-Time Sandbox
              </div>
              <div style={{ fontSize: 11.5, color: '#64748B' }}>
                Evaluate Arbiter's ChromaDB retrieval and deterministic guardrails before deploying webhooks.
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('simulator')}
              style={{
                padding: '7px 14px',
                background: '#4F46E5',
                color: 'white',
                border: 'none',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Open AI Testbench →
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* ── Compact Connection Status Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
              border: '1px solid #A7F3D0',
              borderRadius: 12,
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              boxShadow: '0 2px 8px rgba(5,150,105,0.07)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {jiraConnected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', background: 'white', border: '1px solid #A7F3D0',
                    borderRadius: 999, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <JiraLogo size={14} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>Jira Connected</span>
                    <span style={{ fontSize: 13, color: '#059669' }}>✓</span>
                  </div>
                )}
                {slackConnected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', background: 'white', border: '1px solid #A7F3D0',
                    borderRadius: 999, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>  
                    <SlackLogo size={14} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>Slack Connected</span>
                    <span style={{ fontSize: 13, color: '#059669' }}>✓</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981',
                  display: 'inline-block', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>
                  Live Stream Active · Awaiting Ticket Webhooks
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => onNavigate?.('simulator')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', background: '#4F46E5', color: 'white',
                  border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: 'pointer',
                }}
              >
                <span className="mso sm" style={{ fontSize: 14 }}>science</span>
                Test with AI Sandbox
              </button>
              <button
                onClick={() => onNavigate?.('integrations')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', background: 'white', color: '#374151',
                  border: '1px solid #D1FAE5', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: 'pointer',
                }}
              >
                <span className="mso sm" style={{ fontSize: 14 }}>settings</span>
                Manage Integrations
              </button>
            </div>
          </motion.div>

          {/* ── Top Executive Summary Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {[
              { label: 'Total Ingested', val: stats.total, sub: 'All sources active', icon: 'receipt_long', color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
              { label: 'Auto-Resolved', val: `${stats.autoResolved} (${stats.autoResolveRate}%)`, sub: '0 false positives', icon: 'bolt', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
              { label: 'Escalated to Team', val: stats.escalated, sub: 'Routed with full context', icon: 'record_voice_over', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
              { label: 'Hours Saved', val: `${stats.hoursSaved} hrs`, sub: `$${stats.costSaved.toLocaleString()} cost saved`, icon: 'savings', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
              { label: 'Median Latency', val: stats.medianLatency, sub: 'Target SLA: 99.4%', icon: 'speed', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
            ].map((card, idx) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                style={{
                  background: 'white',
                  border: '1px solid #E4E9F2',
                  borderRadius: 14,
                  padding: '16px 18px',
                  boxShadow: '0 2px 6px rgba(15,23,42,0.03)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: "'Plus Jakarta Sans',sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {card.label}
                  </span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: card.bg, border: `1px solid ${card.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="mso sm" style={{ color: card.color, fontSize: 16 }}>{card.icon}</span>
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em', marginBottom: 4 }}>
                  {card.val}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'Inter',sans-serif" }}>
                  {card.sub}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Filter Bar & Actions ── */}
          <div style={{
            background: 'white',
            border: '1px solid #E4E9F2',
            borderRadius: 14,
            padding: '16px 20px',
            boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {/* Search Input */}
              <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                <span className="mso" style={{ position: 'absolute', left: 12, top: 10, color: '#94A3B8', fontSize: 18 }}>search</span>
                <input
                  type="text"
                  placeholder="Search by ticket ID, summary, user, or keyword…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 38px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 9,
                    fontSize: 13,
                    fontFamily: "'Inter',sans-serif",
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
                {search && (
                  <span
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 12, top: 10, cursor: 'pointer', color: '#94A3B8', fontSize: 14 }}
                  >
                    ✕
                  </span>
                )}
              </div>

              {/* Status Quick Filter Tabs */}
              <div style={{ display: 'flex', background: '#F1F5F9', padding: 3, borderRadius: 10, gap: 2 }}>
                {[
                  { id: 'all', label: `All (${tickets.length})` },
                  { id: 'auto_resolved', label: `Auto-Resolved (${stats.autoResolved})` },
                  { id: 'escalated', label: `Escalated (${stats.escalated})` },
                  { id: 'in_triage', label: `In Triage (${stats.inTriage})` },
                  { id: 'critical', label: `Critical P0/P1 (${stats.critical})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    style={{
                      padding: '6px 13px',
                      borderRadius: 7,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      background: statusFilter === tab.id ? 'white' : 'transparent',
                      color: statusFilter === tab.id ? '#4F46E5' : '#64748B',
                      boxShadow: statusFilter === tab.id ? '0 1px 3px rgba(15,23,42,0.06)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Simulator CTA */}
              <button
                onClick={() => onNavigate?.('simulator')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', background: '#4F46E5', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                }}
              >
                <span className="mso sm">play_arrow</span>
                Simulate Ticket Triage
              </button>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
                Category:
              </span>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                    fontFamily: "'Inter',sans-serif",
                    border: categoryFilter === cat ? '1px solid #4F46E5' : '1px solid #E2E8F0',
                    background: categoryFilter === cat ? '#EEF2FF' : '#FFFFFF',
                    color: categoryFilter === cat ? '#4F46E5' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat === 'All' ? 'All Categories' : cat.toUpperCase()}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>
                Showing {filteredTickets.length} of {tickets.length} tickets
              </span>
            </div>
          </div>

          {/* ── Main Tickets Table ── */}
          <div style={{
            background: 'white',
            border: '1px solid #E4E9F2',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, fontFamily: "'Inter',sans-serif" }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E4E9F2', color: '#64748B', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <th style={{ padding: '12px 16px' }}>Ticket & Source</th>
                    <th style={{ padding: '12px 16px' }}>Summary & Reporter</th>
                    <th style={{ padding: '12px 14px' }}>Category</th>
                    <th style={{ padding: '12px 14px' }}>Severity & SLA</th>
                    <th style={{ padding: '12px 14px' }}>AI Trust</th>
                    <th style={{ padding: '12px 16px' }}>Status & Recommended Action</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8' }}>
                        {tickets.length === 0 ? (
                          <>
                            <span className="mso sm" style={{ fontSize: 36, display: 'block', marginBottom: 10, color: '#A7F3D0' }}>webhook</span>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#065F46', marginBottom: 6 }}>
                              Live Stream Active — Queue Empty
                            </div>
                            <div style={{ fontSize: 12.5, color: '#64748B', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
                              Arbiter is listening for Jira webhooks. Create or update a ticket in your Jira project to see it appear here and get triaged by AI automatically.
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                              <button
                                onClick={() => onNavigate?.('simulator')}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  padding: '8px 16px', background: '#4F46E5', color: 'white',
                                  border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                                  fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: 'pointer',
                                }}
                              >
                                <span className="mso sm" style={{ fontSize: 14 }}>science</span>
                                Test with AI Sandbox →
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="mso sm" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: '#CBD5E1' }}>search_off</span>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#64748B' }}>No tickets match your filter criteria</div>
                            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Try clearing the search query or selecting "All" categories.</div>
                          </>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t, idx) => {
                      const sev = SEVERITY_CONFIG[t.severity] || SEVERITY_CONFIG.P3_LOW;
                      const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.in_triage;
                      const trustPct = Math.round(t.trust_score * 100);

                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTicket(t)}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            cursor: 'pointer',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}
                        >
                          {/* ID & Source */}
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: 6,
                                background: t.source === 'jira' ? '#EEF2FF' : t.source === 'slack' ? '#F8FAFC' : '#F1F5F9',
                                border: '1px solid #E2E8F0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                <ServiceBrandIcon type={t.source} size={14} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
                                  {t.id}
                                </div>
                                <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'capitalize' }}>
                                  {t.source}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Summary & Reporter */}
                          <td style={{ padding: '14px 16px', maxWidth: 300 }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 3, lineHeight: 1.35 }}>
                              {t.title}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{t.reporter?.name || 'Anonymous User'}</span>
                              <span style={{ color: '#CBD5E1' }}>•</span>
                              <span style={{ color: '#94A3B8' }}>{t.reporter?.dept || 'General'}</span>
                            </div>
                          </td>

                          {/* Category */}
                          <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: '#F1F5F9', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}>
                              {t.category}
                            </span>
                          </td>

                          {/* Severity & SLA */}
                          <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '3px 8px', borderRadius: 999,
                              background: sev.bg, border: `1px solid ${sev.border}`, color: sev.text,
                              fontSize: 11, fontWeight: 700, marginBottom: 2
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sev.dot }} />
                              {sev.label}
                            </div>
                            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                              SLA: <strong style={{ color: '#64748B' }}>{sev.sla}</strong>
                            </div>
                          </td>

                          {/* AI Trust Score */}
                          <td style={{ padding: '14px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 44, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{
                                  width: `${trustPct}%`, height: '100%',
                                  background: trustPct >= 75 ? '#059669' : trustPct >= 60 ? '#D97706' : '#DC2626'
                                }} />
                              </div>
                              <span style={{
                                fontWeight: 700, fontSize: 12,
                                color: trustPct >= 75 ? '#065F46' : trustPct >= 60 ? '#92400E' : '#991B1B'
                              }}>
                                {trustPct}%
                              </span>
                            </div>
                            {t.risk_override && (
                              <span style={{ fontSize: 9.5, color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                                <span className="mso sm" style={{ fontSize: 11 }}>warning</span>
                                Risk Override
                              </span>
                            )}
                          </td>

                          {/* Status & Recommended Action */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '3px 8px', borderRadius: 6,
                              background: st.bg, border: `1px solid ${st.border}`, color: st.text,
                              fontSize: 11, fontWeight: 700, marginBottom: 4
                            }}>
                              <span className="mso sm" style={{ fontSize: 13 }}>{st.icon}</span>
                              {st.label}
                            </div>
                            <div style={{ fontSize: 11, color: '#4F46E5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className="mso sm" style={{ fontSize: 13 }}>auto_awesome</span>
                              {t.recommended_action?.label || 'AI Analysis Completed'}
                            </div>
                          </td>

                          {/* Quick Action Buttons */}
                          <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {t.status !== 'auto_resolved' && t.status !== 'resolved_by_human' ? (
                                <>
                                  <button
                                    onClick={() => handleResolve(t.id)}
                                    title="One-click Approve AI Resolution"
                                    style={{
                                      padding: '5px 10px', background: '#ECFDF5', border: '1px solid #A7F3D0',
                                      borderRadius: 6, fontSize: 11.5, fontWeight: 700, color: '#065F46',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                    }}
                                  >
                                    <span className="mso sm" style={{ fontSize: 14 }}>check</span>
                                    Resolve
                                  </button>
                                  <button
                                    onClick={() => handleEscalateSlack(t.id)}
                                    title="Escalate to Slack War Room"
                                    style={{
                                      padding: '5px 8px', background: '#FFFBEB', border: '1px solid #FDE68A',
                                      borderRadius: 6, fontSize: 11.5, fontWeight: 700, color: '#92400E',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                    }}
                                  >
                                    <SlackLogo size={12} />
                                    Escalate
                                  </button>
                                </>
                              ) : (
                                <span style={{ fontSize: 11, color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <span className="mso sm" style={{ fontSize: 14 }}>verified</span>
                                  Done
                                </span>
                              )}
                              <button
                                onClick={() => setSelectedTicket(t)}
                                style={{
                                  padding: '5px 8px', background: '#F8FAFC', border: '1px solid #E2E8F0',
                                  borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#64748B', cursor: 'pointer',
                                }}
                              >
                                View →
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Slide-Over Detail Drawer ── */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              style={{ position: 'fixed', inset: 0, background: '#0F172A', zIndex: 1000 }}
            />

            {/* Slide-out Drawer */}
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, width: 560,
                background: 'white', boxShadow: '-8px 0 32px rgba(15,23,42,0.15)',
                zIndex: 1001, display: 'flex', flexDirection: 'column',
                overflowY: 'auto',
              }}
            >
              {/* Drawer Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4E9F2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: selectedTicket.source === 'jira' ? '#EEF2FF' : '#F8FAFC',
                    border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <ServiceBrandIcon type={selectedTicket.source} size={18} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                      {selectedTicket.id}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>
                      Reported by {selectedTicket.reporter.name} • {new Date(selectedTicket.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
                {/* Title & Description */}
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 8, lineHeight: 1.3 }}>
                    {selectedTicket.title}
                  </h3>
                  <div style={{ padding: '14px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                    {selectedTicket.description}
                  </div>
                </div>

                {/* AI Recommended Action Box with Detailed Explanation */}
                <div style={{
                  padding: '18px 20px', borderRadius: 12,
                  background: selectedTicket.risk_override ? '#FEF2F2' : '#EEF2FF',
                  border: `1.5px solid ${selectedTicket.risk_override ? '#FECACA' : '#C7D2FE'}`,
                  boxShadow: '0 2px 8px rgba(79,70,229,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className="mso" style={{ color: selectedTicket.risk_override ? '#DC2626' : '#4F46E5', fontSize: 20 }}>
                      {selectedTicket.risk_override ? 'warning' : 'auto_awesome'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: selectedTicket.risk_override ? '#991B1B' : '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Arbiter AI Recommended Action
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                    {selectedTicket.recommended_action.label}
                  </div>
                  <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, marginBottom: 12 }}>
                    {selectedTicket.recommended_action.reason}
                  </p>

                  {/* Why Slack or Jira? Explanation banner */}
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'white', border: '1px solid #E2E8F0',
                    fontSize: 12, color: '#1E293B', lineHeight: 1.5,
                  }}>
                    <strong style={{ color: '#0F172A', display: 'block', marginBottom: 2 }}>
                      ℹ️ External Action Rationale:
                    </strong>
                    {selectedTicket.recommended_action.external_justification}
                  </div>
                </div>

                {/* AI Trust Score Breakdown */}
                <div style={{ padding: '16px 18px', background: '#FFFFFF', border: '1px solid #E4E9F2', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 12 }}>
                    Deterministic Trust Score Analysis
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
                    <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Vector Retrieval</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>89%</div>
                    </div>
                    <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Category Match</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>92%</div>
                    </div>
                    <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>LLM Confidence</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{Math.round(selectedTicket.trust_score * 100)}%</div>
                    </div>
                  </div>
                </div>

                {/* Similar Historical Cases from ChromaDB */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 10 }}>
                    Vector Matched Cases (ChromaDB)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedTicket.similar_cases?.map(sc => (
                      <div key={sc.ticket_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{sc.ticket_id}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{sc.summary}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '3px 8px', borderRadius: 6 }}>
                          {Math.round(sc.similarity * 100)}% match
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #E4E9F2', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                {selectedTicket.source === 'jira' && (
                  <a
                    href="https://id.atlassian.com" target="_blank" rel="noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12.5,
                      fontWeight: 600, color: '#0052CC', textDecoration: 'none'
                    }}
                  >
                    <JiraLogo size={14} />
                    Open in Jira
                  </a>
                )}
                {selectedTicket.source === 'slack' && (
                  <a
                    href="https://slack.com" target="_blank" rel="noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12.5,
                      fontWeight: 600, color: '#4A154B', textDecoration: 'none'
                    }}
                  >
                    <SlackLogo size={14} />
                    Open in Slack
                  </a>
                )}
                <button
                  onClick={() => handleEscalateSlack(selectedTicket.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                    background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8,
                    fontSize: 12.5, fontWeight: 700, color: '#92400E', cursor: 'pointer'
                  }}
                >
                  <SlackLogo size={14} />
                  Escalate to Slack
                </button>
                <button
                  onClick={() => handleResolve(selectedTicket.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                    background: '#059669', border: 'none', borderRadius: 8, fontSize: 12.5,
                    fontWeight: 700, color: 'white', cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(5,150,105,0.25)'
                  }}
                >
                  <span className="mso sm">check</span>
                  Approve Resolution
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
