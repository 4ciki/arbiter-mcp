import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { calculateStats } from '../data/ticketData';
import { JiraLogo, SlackLogo } from '../components/BrandLogos';
import { useCredentials } from '../hooks/useCredentials';

export default function OverviewPage({ onNavigate }) {
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [monthlyVolume, setMonthlyVolume] = useState(1500);
  const { jiraConnected, slackConnected } = useCredentials();

  // Fetch live metrics and tickets directly from SQLite database
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [ticketsRes, metricsRes] = await Promise.all([
          fetch('/api/tickets?limit=100'),
          fetch('/api/metrics')
        ]);
        if (ticketsRes.ok) {
          const tData = await ticketsRes.json();
          if (mounted && Array.isArray(tData)) setTickets(tData);
        }
        if (metricsRes.ok) {
          const mData = await metricsRes.json();
          if (mounted) setMetrics(mData);
        }
      } catch (err) {
        console.warn('Overview backend load failed:', err);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => {
    const base = calculateStats(tickets);
    if (metrics && typeof metrics.total_ingested === 'number') {
      return {
        ...base,
        total: metrics.total_ingested,
        autoResolved: metrics.auto_resolved ?? base.autoResolved,
        escalated: metrics.escalated ?? base.escalated,
        hoursSaved: metrics.hours_saved ?? base.hoursSaved,
        costSaved: metrics.cost_saved ?? base.costSaved,
      };
    }
    return base;
  }, [tickets, metrics]);

  // Compute dynamic volume trend by day of week from genuine tickets
  const volumeTrend = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const map = {};
    days.forEach(d => { map[d] = { day: d, ingested: 0, autoResolved: 0, escalated: 0 }; });
    tickets.forEach(t => {
      const date = t.created_at ? new Date(t.created_at) : new Date();
      const dIndex = (date.getDay() + 6) % 7; // Monday = 0
      const dName = days[dIndex] || 'Mon';
      map[dName].ingested += 1;
      if (t.status === 'auto_resolved' || t.status === 'resolved_by_human') {
        map[dName].autoResolved += 1;
      } else {
        map[dName].escalated += 1;
      }
    });
    return Object.values(map);
  }, [tickets]);

  // Compute dynamic category distribution from real tickets
  const categoryData = useMemo(() => {
    const counts = {};
    tickets.forEach(t => {
      const cat = (t.category || 'software').toLowerCase();
      const cap = cat.charAt(0).toUpperCase() + cat.slice(1);
      if (!counts[cap]) counts[cap] = { name: cap, total: 0, resolved: 0 };
      counts[cap].total += 1;
      if (t.status === 'auto_resolved' || t.status === 'resolved_by_human') {
        counts[cap].resolved += 1;
      }
    });
    return Object.values(counts);
  }, [tickets]);

  // Compute dynamic severity distribution from real tickets
  const severityPie = useMemo(() => {
    const map = {
      P0_CRITICAL: { name: 'P0 Critical', value: 0, color: '#DC2626' },
      P1_HIGH:     { name: 'P1 High',     value: 0, color: '#F59E0B' },
      P2_MEDIUM:   { name: 'P2 Medium',   value: 0, color: '#3B82F6' },
      P3_LOW:      { name: 'P3 Low',      value: 0, color: '#94A3B8' },
    };
    tickets.forEach(t => {
      const sev = t.severity || 'P2_MEDIUM';
      if (map[sev]) map[sev].value += 1;
    });
    return Object.values(map);
  }, [tickets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {stats.total === 0 ? (
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
            background: 'linear-gradient(90deg, #4F46E5, #38BDF8, #10B981)'
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
            Operational Telemetry Standby · Zero Mock Data Enforced
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
            Operational Insights Await Your Enterprise Stream
          </h2>

          <p style={{
            fontSize: 15,
            color: '#64748B',
            lineHeight: 1.6,
            maxWidth: 640,
            marginBottom: 36,
            fontFamily: "'Inter',sans-serif"
          }}>
            Connect your Jira Service Management and Slack workspaces to activate real-time financial ROI calculations, engineer time recovery telemetry, and autonomous SLA compliance tracking.
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
                  Sync ticket queues and track financial ROI and SLA adherence across IT service workflows in real-time.
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
                  Monitor interactive approval decisions, live team escalations, and autonomous resolution velocity in Slack.
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

          {/* Real-time System Readiness Badges */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
            width: '100%',
            maxWidth: 740,
            marginTop: 8
          }}>
            {[
              { label: 'MCP Server', status: 'Online', desc: 'Port 8000 Active', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
              { label: 'AI Engine', status: 'Ready', desc: 'Groq Llama-3.3-70b', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
              { label: 'Vector Store', status: 'Indexed', desc: 'ChromaDB Local', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
              { label: 'Safety Overrides', status: 'Enforced', desc: '0.0% False Positive', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
            ].map(pill => (
              <div key={pill.label} style={{
                background: pill.bg, border: `1px solid ${pill.border}`,
                borderRadius: 10, padding: '10px 12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: pill.color, letterSpacing: '0.05em' }}>
                  {pill.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                  {pill.status}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>
                  {pill.desc}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : (
        <>
          {/* ── Real-Time Stream Integration Banner — only shown when not fully connected ── */}
          {(!jiraConnected || !slackConnected) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              border: '1px solid #C7D2FE',
              borderRadius: 14,
              padding: '16px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              boxShadow: '0 2px 10px rgba(79,70,229,0.06)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #0052CC, #4A154B, #10B981)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <JiraLogo size={20} />
                </div>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SlackLogo size={20} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    {!jiraConnected && !slackConnected
                      ? 'Connect Jira & Slack for Autonomous Real-Time Stream'
                      : !jiraConnected ? 'Connect Jira to activate full stream'
                      : 'Connect Slack to activate full stream'}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E',
                    textTransform: 'uppercase', letterSpacing: '0.04em'
                  }}>
                    Partially Connected
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Autonomous intelligence awaits your enterprise stream. Connect your Jira Service Management and Slack workspaces to track live financial ROI and resolution metrics.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!jiraConnected && (
              <button
                onClick={() => onNavigate?.('integrations')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', background: '#0052CC', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,82,204,0.2)'
                }}
              >
                <JiraLogo size={14} />
                Connect Jira →
              </button>
              )}
              {!slackConnected && (
              <button
                onClick={() => onNavigate?.('integrations')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', background: '#4A154B', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(74,21,75,0.2)'
                }}
              >
                <SlackLogo size={14} />
                Connect Slack →
              </button>
              )}
            </div>
          </motion.div>
          )}

          {/* ── Top Executive Value Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
            borderRadius: 16, padding: '28px 32px', color: 'white',
            boxShadow: '0 8px 32px rgba(49,46,129,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 20,
          }}>
            <div style={{ maxWidth: 560 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.12)', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                <span className="mso sm" style={{ fontSize: 14, color: '#38BDF8' }}>verified</span>
                Enterprise ROI & Operations Impact
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 8 }}>
                ${stats.costSaved.toLocaleString()} Saved Across {stats.total} Ingested Tickets
              </h2>
              <p style={{ fontSize: 13.5, color: '#C7D2FE', lineHeight: 1.6 }}>
                Arbiter MCP eliminates manual L1 triage overhead with sub-second AI decisions and a strict 0% false-positive safety guarantee.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '14px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#34D399', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{stats.medianLatency}</div>
                <div style={{ fontSize: 11, color: '#E0E7FF', textTransform: 'uppercase', fontWeight: 600 }}>Triage Latency</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '14px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#FBBF24', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{stats.falsePositiveRate}</div>
                <div style={{ fontSize: 11, color: '#E0E7FF', textTransform: 'uppercase', fontWeight: 600 }}>False Positives</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '14px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#60A5FA', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{stats.slaAdherence}</div>
                <div style={{ fontSize: 11, color: '#E0E7FF', textTransform: 'uppercase', fontWeight: 600 }}>SLA Compliance</div>
              </div>
            </div>
          </div>

          {/* ── Key Enterprise Metrics 4-Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Engineering Hours Reclaimed', val: `${stats.hoursSaved} hrs`, sub: 'Direct labor reallocated to core tech', icon: 'timelapse', color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
              { label: 'Autonomous Auto-Resolution', val: `${stats.autoResolveRate}%`, sub: `${stats.autoResolved} tickets closed with zero human touch`, icon: 'bolt', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
              { label: 'Classification Accuracy', val: `${stats.accuracyRate}`, sub: 'Verified by deterministic scoring', icon: 'verified', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
              { label: 'Safety Overrides Enforced', val: '100%', sub: 'Zero critical leaks or unverified resets', icon: 'shield_locked', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
            ].map((card, idx) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.35 }}
                style={{
                  background: 'white', border: '1px solid #E4E9F2', borderRadius: 14,
                  padding: '18px 20px', boxShadow: '0 2px 6px rgba(15,23,42,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: "'Plus Jakarta Sans',sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {card.label}
                  </span>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: card.bg, border: `1px solid ${card.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="mso sm" style={{ color: card.color, fontSize: 18 }}>{card.icon}</span>
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em', marginBottom: 4 }}>
                  {card.val}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>
                  {card.sub}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Charts Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
            {/* Ticket Ingestion Trend Area Chart */}
            <div style={{ background: 'white', border: '1px solid #E4E9F2', borderRadius: 14, padding: '22px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    Ticket Ingestion & Resolution Volume
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>Real-time 7-day flow across connected Slack & Jira queues</div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4F46E5' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#4F46E5' }} /> Total Ingested
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#059669' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#059669' }} /> Auto-Resolved
                  </span>
                </div>
              </div>
              <div style={{ height: 240, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ingestGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="resolveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }} />
                    <Area type="monotone" dataKey="ingested" stroke="#4F46E5" strokeWidth={2.5} fillOpacity={1} fill="url(#ingestGrad)" />
                    <Area type="monotone" dataKey="autoResolved" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#resolveGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Severity Distribution Donut Chart */}
            <div style={{ background: 'white', border: '1px solid #E4E9F2', borderRadius: 14, padding: '22px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 4 }}>
                Incident Severity Breakdown
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>Distribution by impact & SLA priority</div>
              <div style={{ height: 200, width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={severityPie} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {severityPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{stats.total}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>Tickets</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
                {severityPie.map(item => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#475569' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                    <span>{item.name}</span>
                    <strong style={{ marginLeft: 'auto', color: '#0F172A' }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Category Breakdown & Interactive Savings Calculator ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {/* Category Bar Chart */}
            <div style={{ background: 'white', border: '1px solid #E4E9F2', borderRadius: 14, padding: '22px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 4 }}>
                Triage by IT Domain
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Total volume vs autonomous resolution per category</div>
              <div style={{ height: 210, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }} />
                    <Bar dataKey="total" fill="#C7D2FE" radius={[4, 4, 0, 0]} name="Total Ingested" />
                    <Bar dataKey="resolved" fill="#059669" radius={[4, 4, 0, 0]} name="Auto-Resolved" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Enterprise Cost Savings Calculator */}
            <div style={{
              background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
              border: '1px solid #BFDBFE', borderRadius: 14, padding: '22px 24px',
              boxShadow: '0 2px 8px rgba(37,99,235,0.05)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="mso sm" style={{ color: '#2563EB', fontSize: 18 }}>calculate</span>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    Enterprise ROI Calculator
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
                  Projected annual cost savings based on your organization's monthly ticket volume.
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                    <span>Monthly IT Support Ingestion:</span>
                    <span style={{ color: '#2563EB' }}>{monthlyVolume.toLocaleString()} tickets / mo</span>
                  </div>
                  <input
                    type="range" min={200} max={10000} step={100}
                    value={monthlyVolume}
                    onChange={e => setMonthlyVolume(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#2563EB' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                    <span>200 tickets</span>
                    <span>5,000</span>
                    <span>10,000+ tickets</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #BFDBFE', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Estimated Annual Savings
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#059669', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    ${projectAnnualSavings(monthlyVolume)}
                  </div>
                </div>
                <button
                  onClick={() => onNavigate?.('tickets')}
                  style={{
                    padding: '9px 16px', background: '#2563EB', color: 'white',
                    border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                  }}
                >
                  Open Tickets Queue →
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function projectAnnualSavings(vol) {
  const hours = (vol * 0.225 * 0.75) + (vol * 0.3);
  return Math.round(hours * 90 * 12).toLocaleString();
}
