import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useInView } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import ArbiterLogo from '../components/ArbiterLogo';
import { JiraLogo, SlackLogo, GroqIcon, ClaudeLogo } from '../components/BrandLogos';
import AskAISection from '../components/AskAISection';

const ERR = {
  'auth/popup-blocked':         'Pop-up was blocked — allow pop-ups for this page and retry.',
  'auth/popup-closed-by-user':  'Sign-in cancelled. Please try again.',
  'auth/network-request-failed':'Network error — check your internet connection.',
  'auth/unauthorized-domain':   'This domain is not authorised in Firebase. Add it in the Firebase console.',
};

const T  = '#1ABC9C';
const TD = '#0D8A72';
const A  = '#F39C12';

// Floating particle
function Particle({ x, y, size, color, duration, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, x: 0 }}
      animate={{ opacity: [0, 0.6, 0], y: [-20, -110], x: [0, (Math.random() - 0.5) * 60] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeOut' }}
      style={{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: '50%',
        background: color, filter: `blur(${size * 0.3}px)`,
        pointerEvents: 'none',
      }}
    />
  );
}

function ParticleField() {
  const particles = Array.from({ length: 26 }, (_, i) => ({
    id: i,
    x: `${Math.random() * 100}%`,
    y: `${40 + Math.random() * 60}%`,
    size: 3 + Math.random() * 6,
    color: i % 3 === 0 ? 'rgba(26,188,156,0.7)' : i % 3 === 1 ? 'rgba(243,156,18,0.7)' : 'rgba(26,188,156,0.35)',
    duration: 3.5 + Math.random() * 4,
    delay: Math.random() * 5,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => <Particle key={p.id} {...p} />)}
    </div>
  );
}

// 3D tilt card
function TiltCard({ children, style }) {
  const ref = useRef(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sX = useSpring(rotX, { stiffness: 200, damping: 20 });
  const sY = useSpring(rotY, { stiffness: 200, damping: 20 });
  const handleMove = (e) => {
    const el = ref.current; if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    rotX.set(-((e.clientY - top) / height - 0.5) * 14);
    rotY.set(((e.clientX - left) / width - 0.5) * 14);
  };
  return (
    <motion.div ref={ref} onMouseMove={handleMove} onMouseLeave={() => { rotX.set(0); rotY.set(0); }}
      style={{ ...style, rotateX: sX, rotateY: sY, transformStyle: 'preserve-3d', perspective: 800 }}>
      {children}
    </motion.div>
  );
}

// Animated counter
function Counter({ from = 0, to, suffix = '', duration = 2 }) {
  const [val, setVal] = useState(from);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / (duration * 1000), 1);
          const ease = 1 - Math.pow(1 - t, 4);
          setVal(Math.round(from + (to - from) * ease));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [from, to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

const FEATURES = [
  { icon: 'psychology',           title: 'Intelligent AI Triage',    body: 'AI-powered reasoning classifies tickets by priority, category, and urgency in under 2 seconds — no manual sorting ever again.',          teal: true  },
  { icon: 'link',                 title: 'Jira Native Integration',   body: 'Webhook-first architecture: every Jira issue created or updated triggers automated triage and Slack notification instantly.',             teal: false },
  { icon: 'notifications_active', title: 'Slack Intelligence Layer',  body: 'Context-rich Slack notifications include severity, affected system, AI-suggested response, and direct Jira deep-links.',                   teal: true  },
  { icon: 'analytics',            title: 'Real-time Analytics',       body: 'Live dashboards track ticket velocity, MTTR, SLA breach risk, and agent load — all synced from Supabase cloud.',                           teal: false },
  { icon: 'security',             title: 'Enterprise Ready',          body: 'Firestore-backed auth, encrypted credential storage, per-user isolation, and full audit trail baked in from day one.',                      teal: true  },
  { icon: 'code',                 title: 'Open Source & Extensible',  body: 'MIT-licensed. Self-host on Render, Railway, or Fly.io. Swap LLM providers, add adapters, and fork without friction.',                      teal: false },
];

const HOW_IT_WORKS = [
  { step: '01', icon: 'confirmation_number', color: '#1ABC9C', title: 'Ticket Created in Jira',    body: 'Your team raises a support ticket in Jira Service Management as usual — zero workflow changes required.', detail: 'Any Jira project · Any issue type' },
  { step: '02', icon: 'bolt',                color: '#F39C12', title: 'Webhook Fires Instantly',   body: "Arbiter's webhook endpoint receives the event in real-time, within milliseconds of creation or update.",   detail: 'Sub-50ms delivery · Retry on failure' },
  { step: '03', icon: 'psychology',          color: '#1ABC9C', title: 'AI Agent Triages',          body: 'The LangGraph agent weighs similarity to solved cases, category success rate, and model confidence to decide.', detail: 'Groq + Claude LLM ensemble' },
  { step: '04', icon: 'call_split',          color: '#F39C12', title: 'Route: Auto or Human',      body: 'Routine & safe tickets are resolved automatically. Uncertain or risky ones escalate to your team instantly.',   detail: 'Trust-score threshold · Always auditable' },
  { step: '05', icon: 'send',                color: '#1ABC9C', title: 'Slack Alert Dispatched',    body: 'A rich Slack notification lands in the right channel with severity, AI-suggested reply, and Jira deep-links.',  detail: 'Context-rich · Actionable' },
];

const PAIN_POINTS = [
  { icon: 'lock',     label: 'Password reset',   type: 'routine' },
  { icon: 'wifi_off', label: 'Wi-Fi issue',       type: 'routine' },
  { icon: 'print',    label: 'Printer problem',   type: 'routine' },
  { icon: 'warning',  label: 'Server down!',      type: 'urgent'  },
  { icon: 'lock',     label: 'VPN access',        type: 'routine' },
  { icon: 'email',    label: 'Email bounce',      type: 'routine' },
  { icon: 'devices',  label: 'Hardware fault',    type: 'routine' },
  { icon: 'priority_high', label: 'Data breach?', type: 'urgent'  },
  { icon: 'lock',     label: 'Account locked',    type: 'routine' },
];

const STATS = [
  { value: 2,   suffix: 's',  label: 'avg triage time'             },
  { value: 94,  suffix: '%',  label: 'classification accuracy'     },
  { value: 60,  suffix: '%',  label: 'reduction in manual triage'  },
  { value: 100, suffix: '%',  label: 'open source'                 },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function LoginScreen({ signIn }) {
  const [busy, setBusy]           = useState(false);
  const [err,  setErr]            = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const { scrollY }               = useScroll();
  const heroY                     = useTransform(scrollY, [0, 400], [0, -80]);
  const heroOpacity               = useTransform(scrollY, [0, 300], [1, 0]);

  const handle = async () => {
    setBusy(true); setErr('');
    const timer = setTimeout(() => setBusy(false), 12000);
    try {
      await signIn(); clearTimeout(timer); setBusy(false);
    } catch (e) {
      clearTimeout(timer); setBusy(false);
      if (e?.code === 'auth/popup-closed-by-user') {
        setErr('Sign-in cancelled. Click below to try again.');
      } else {
        setErr(ERR[e?.code] || e?.message || 'Authentication failed — please try again.');
      }
    }
  };

  return (
    <div style={{ background: '#060D0B', minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Inter', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @import url('https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .mso { font-family: 'Material Symbols Outlined'; font-style: normal; font-weight: normal; letter-spacing: normal; text-transform: none; white-space: nowrap; word-wrap: normal; direction: ltr; -webkit-font-smoothing: antialiased; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #060D0B; }
        ::-webkit-scrollbar-thumb { background: rgba(26,188,156,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(26,188,156,0.4); }
        @keyframes beacon-ring { 0% { transform:scale(0.85);opacity:0.8; } 100% { transform:scale(2.2);opacity:0; } }
        @keyframes shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
        @keyframes glow-pulse { 0%,100% { box-shadow:0 0 20px rgba(26,188,156,0.3),0 0 60px rgba(26,188,156,0.1); } 50% { box-shadow:0 0 40px rgba(26,188,156,0.5),0 0 100px rgba(26,188,156,0.2); } }
        @keyframes float-y { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-10px); } }
        @keyframes grid-pulse { 0%,100% { opacity:0.04; } 50% { opacity:0.09; } }
        @keyframes ticket-fall { 0%{transform:translateY(-60px) rotate(-8deg);opacity:0;} 40%{opacity:1;} 100%{transform:translateY(0) rotate(var(--r));opacity:1;} }
        @keyframes scan-line { 0%{transform:translateY(-100%);} 100%{transform:translateY(400%);} }
        @keyframes path-flow { 0%{stroke-dashoffset:300;} 100%{stroke-dashoffset:0;} }
        @keyframes spin-slow { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.6;} 100%{transform:scale(1.8);opacity:0;} }
        @keyframes data-stream { 0%{transform:translateX(-100%);opacity:0;} 20%{opacity:1;} 80%{opacity:1;} 100%{transform:translateX(100%);opacity:0;} }
        .shimmer-text { background:linear-gradient(90deg,#1ABC9C,#F39C12,#1ABC9C); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:shimmer 3s linear infinite; }
        .glow-btn { animation:glow-pulse 3s ease-in-out infinite; }
        .step-connector { position:absolute; left:35px; top:64px; width:2px; bottom:0; background:linear-gradient(to bottom,rgba(26,188,156,0.4),rgba(243,156,18,0.15)); }
        .ticket-card { border-radius:10px; background:rgba(15,30,26,0.9); border:1px solid rgba(26,188,156,0.18); padding:10px 14px; display:flex; align-items:center; gap:8px; backdrop-filter:blur(8px); }
        .urgent-ticket { border-color:rgba(243,156,18,0.5); background:rgba(40,25,5,0.9); }
        @keyframes wiggle { 0%,100%{transform:rotate(-1deg);} 50%{transform:rotate(1deg);} }
      `}</style>

      {/* ── Navbar ── */}
      <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          padding: '0 40px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(6,13,11,0.85)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(26,188,156,0.08)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ArbiterLogo size={32} animate="gyro" />
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17, color: '#F0FDF9', letterSpacing: '-0.02em' }}>Arbiter MCP</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', background: `linear-gradient(90deg,${T},${A})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase', marginLeft: 4 }}>Beta</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#how-it-works">How it works</NavLink>
          <a href="https://github.com/4ciki/arbiter-mcp" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#F0FDF9'} onMouseLeave={e => e.currentTarget.style.color = '#64748B'}>
            <span className="mso" style={{ fontSize: 16 }}>code</span>GitHub
          </a>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowLogin(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 9, background: `linear-gradient(135deg,${T},${TD})`, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: `0 4px 20px rgba(26,188,156,0.35)`, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 30px rgba(26,188,156,0.5)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 20px rgba(26,188,156,0.35)`; }}>
            <span className="mso" style={{ fontSize: 15 }}>login</span>Sign In
          </motion.button>
        </div>
      </motion.nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 64, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(26,188,156,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(26,188,156,0.05) 1px,transparent 1px)`, backgroundSize: '60px 60px', animation: 'grid-pulse 4s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle,rgba(26,188,156,0.11) 0%,rgba(243,156,18,0.05) 40%,transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <ParticleField />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 880, margin: '0 auto', position: 'relative', zIndex: 2 }}>

            {/* Live badge */}
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px 6px 10px', borderRadius: 999, background: 'rgba(26,188,156,0.08)', border: '1px solid rgba(26,188,156,0.2)', marginBottom: 32 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: T, boxShadow: `0 0 8px ${T}`, display: 'inline-block', position: 'relative' }}>
                <span style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1px solid ${T}`, animation: 'beacon-ring 1.6s ease-out infinite' }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: T, letterSpacing: '0.05em', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Open-source AI helpdesk intelligence — now live</span>
            </motion.div>

            {/* Logo */}
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35, type: 'spring', stiffness: 160, damping: 14 }} style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
              <ArbiterLogo size={96} animate="gyro" />
            </motion.div>

            {/* Headline */}
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.04em', color: '#F0FDF9', marginBottom: 24 }}>
              Your IT helpdesk,<br /><span className="shimmer-text">driven by AI.</span>
            </motion.h1>

            {/* Subline */}
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6 }}
              style={{ fontSize: 'clamp(15px,2vw,19px)', color: '#94A3B8', lineHeight: 1.75, maxWidth: 620, margin: '0 auto 40px', fontWeight: 400 }}>
              Arbiter connects Jira, Slack, and any LLM to automatically classify, prioritise, and route every support ticket — so your team focuses on solving problems, not sorting them.
            </motion.p>

            {/* CTA */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.5 }} style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowLogin(true)} className="glow-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderRadius: 12, background: `linear-gradient(135deg,${T} 0%,${TD} 100%)`, border: `1px solid rgba(26,188,156,0.4)`, fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <span className="mso" style={{ fontSize: 18 }}>rocket_launch</span>Launch Arbiter
              </motion.button>
              <a href="https://github.com/4ciki/arbiter-mcp" target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 12, background: 'rgba(240,253,249,0.05)', border: '1px solid rgba(240,253,249,0.12)', fontSize: 15, fontWeight: 600, color: '#CBD5E1', textDecoration: 'none', transition: 'all 0.2s', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,253,249,0.08)'; e.currentTarget.style.color = '#F0FDF9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(240,253,249,0.05)'; e.currentTarget.style.color = '#CBD5E1'; }}>
                <span className="mso" style={{ fontSize: 18 }}>code</span>View Source
              </a>
            </motion.div>

            {/* Integrations */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.6 }} style={{ marginTop: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Integrates with</span>
              {[{ icon: <JiraLogo size={14} />, label: 'Jira' }, { icon: <SlackLogo size={14} />, label: 'Slack' }, { icon: <GroqIcon size={14} />, label: 'Groq' }, { icon: <ClaudeLogo size={14} theme="dark" iconOnly />, label: 'Claude' }, { icon: <span className="mso" style={{ fontSize: 13, color: '#6366F1' }}>database</span>, label: 'Supabase' }].map(p => (
                <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 999, background: 'rgba(240,253,249,0.04)', border: '1px solid rgba(240,253,249,0.08)', fontSize: 12, fontWeight: 600, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  {p.icon}{p.label}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)' }}>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#334155' }}>Explore</span>
            <span className="mso" style={{ fontSize: 20, color: '#334155' }}>keyboard_arrow_down</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS BAND ── */}
      <section style={{ padding: '64px 40px', borderTop: '1px solid rgba(26,188,156,0.08)', borderBottom: '1px solid rgba(26,188,156,0.08)', background: 'rgba(26,188,156,0.02)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 40 }}>
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 48, fontWeight: 900, letterSpacing: '-0.04em', background: i % 2 === 0 ? `linear-gradient(135deg,${T},${TD})` : `linear-gradient(135deg,${A},#C47D09)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 6 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '100px 40px', position: 'relative' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel icon="auto_awesome">Capabilities</SectionLabel>
          <SectionTitle>Built for IT teams that move fast</SectionTitle>
          <SectionSub>Everything you need to automate first-line support, end to end.</SectionSub>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginTop: 56 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -4, transition: { duration: 0.2 } }}
                style={{ padding: '28px 26px', borderRadius: 16, background: 'rgba(240,253,249,0.03)', border: '1px solid rgba(240,253,249,0.07)', backdropFilter: 'blur(10px)', cursor: 'default', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: f.teal ? 'radial-gradient(circle at top right,rgba(26,188,156,0.12),transparent)' : 'radial-gradient(circle at top right,rgba(243,156,18,0.08),transparent)', pointerEvents: 'none' }} />
                <div style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: f.teal ? 'rgba(26,188,156,0.12)' : 'rgba(243,156,18,0.1)', border: `1px solid ${f.teal ? 'rgba(26,188,156,0.2)' : 'rgba(243,156,18,0.2)'}` }}>
                  <span className="mso" style={{ fontSize: 22, color: f.teal ? T : A }}>{f.icon}</span>
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, color: '#E2F8F3', marginBottom: 10, letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.7 }}>{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY ARBITER ── */}
      <section style={{ padding: '100px 40px', position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(26,188,156,0.06)' }}>
        {/* subtle bg radial */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 50% at 50% 60%,rgba(26,188,156,0.04) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel icon="psychology_alt">The Problem</SectionLabel>
          <SectionTitle>Every day, the same tickets pile up.</SectionTitle>
          <SectionSub>Most are routine. A few are urgent. Without AI, your team can&apos;t tell which is which — until it&apos;s too late.</SectionSub>

          {/* ── ANIMATED STAGE ── */}
          <div style={{ marginTop: 64, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 32, alignItems: 'center', minHeight: 480 }}>

            {/* LEFT: ticket pile */}
            <div style={{ position: 'relative', height: 420 }}>
              <motion.div initial={{ opacity:0, x:-40 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration:0.6 }}
                style={{ position:'absolute', top:0, left:0, right:0, bottom:0 }}>
                {/* pile label */}
                <div style={{ position:'absolute', top:0, left:0, zIndex:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#64748B', marginBottom:4 }}>Incoming tickets</div>
                  <div style={{ fontSize:12, color:'#475569' }}>Every 10 minutes. Same overload.</div>
                </div>
                {/* stacked ticket cards */}
                {PAIN_POINTS.map((t, i) => (
                  <motion.div key={i}
                    initial={{ opacity:0, y:-80, rotate: (i%3===0?-6:i%3===1?3:-2) }}
                    whileInView={{ opacity:1, y:0, rotate:(i%3===0?-6:i%3===1?3:-2) }}
                    viewport={{ once:true }}
                    transition={{ delay: 0.1 + i*0.08, type:'spring', stiffness:140, damping:16 }}
                    whileHover={{ scale:1.04, zIndex:20 }}
                    style={{
                      position:'absolute',
                      left: `${8 + (i%3)*8}%`,
                      top: `${70 + Math.floor(i/3)*72}px`,
                      zIndex: PAIN_POINTS.length - i,
                      cursor:'default',
                    }}>
                    <div className={`ticket-card${t.type==='urgent'?' urgent-ticket':''}`}
                      style={{ minWidth:160, boxShadow: t.type==='urgent'
                        ? '0 4px 24px rgba(243,156,18,0.25)'
                        : '0 4px 16px rgba(0,0,0,0.4)' }}>
                      <span className="mso" style={{ fontSize:15,
                        color: t.type==='urgent' ? '#F39C12' : '#1ABC9C' }}>{t.icon}</span>
                      <span style={{ fontSize:12, fontWeight:600,
                        color: t.type==='urgent' ? '#FBBF24' : '#94A3B8',
                        fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{t.label}</span>
                      {t.type==='urgent' && (
                        <motion.span animate={{ opacity:[1,0.3,1] }} transition={{ duration:0.9, repeat:Infinity }}
                          className="mso" style={{ fontSize:13, color:'#F59E0B', marginLeft:'auto' }}>priority_high</motion.span>
                      )}
                    </div>
                  </motion.div>
                ))}
                {/* frustrated dev */}
                <motion.div initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ delay:1 }}
                  style={{ position:'absolute', bottom:8, right:0, padding:'10px 16px',
                    borderRadius:12, background:'rgba(15,25,22,0.9)', border:'1px solid rgba(240,253,249,0.08)',
                    fontSize:12, color:'#64748B', fontFamily:"'Plus Jakarta Sans',sans-serif", display:'flex', alignItems:'center', gap:8 }}>
                  <motion.span className="mso" style={{ fontSize:18, color:'#F39C12' }}
                    animate={{ rotate:[-5,5,-5] }} transition={{ duration:1.8, repeat:Infinity }}>sentiment_dissatisfied</motion.span>
                  <span>Same tickets.<br/>Every. Day.</span>
                </motion.div>
              </motion.div>
            </div>

            {/* CENTRE: Arbiter hub */}
            <motion.div initial={{ opacity:0, scale:0.6 }} whileInView={{ opacity:1, scale:1 }}
              viewport={{ once:true }} transition={{ delay:0.5, type:'spring', stiffness:120, damping:14 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, position:'relative', zIndex:5 }}>
              {/* pulsing ring */}
              <div style={{ position:'relative', width:88, height:88 }}>
                {[0,1,2].map(j => (
                  <motion.div key={j} style={{ position:'absolute', inset:-j*12, borderRadius:'50%',
                    border:'1px solid rgba(26,188,156,0.3)', pointerEvents:'none' }}
                    animate={{ opacity:[0.6,0,0.6], scale:[1,1.25,1] }}
                    transition={{ duration:2.4, repeat:Infinity, delay:j*0.7 }} />
                ))}
                <div style={{ width:88, height:88, borderRadius:'50%',
                  background:'linear-gradient(135deg,rgba(26,188,156,0.15),rgba(243,156,18,0.08))',
                  border:'2px solid rgba(26,188,156,0.4)', display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 0 40px rgba(26,188,156,0.3)' }}>
                  <ArbiterLogo size={44} animate="gyro" />
                </div>
              </div>
              {/* scan beam */}
              <div style={{ width:2, height:60, background:'linear-gradient(to bottom,rgba(26,188,156,0.5),transparent)', position:'relative', overflow:'hidden' }}>
                <motion.div animate={{ y:['-100%','200%'] }} transition={{ duration:1.5, repeat:Infinity, ease:'linear' }}
                  style={{ position:'absolute', width:'100%', height:'40%', background:`linear-gradient(to bottom,transparent,${T},transparent)` }} />
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#E2F8F3', fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'-0.02em' }}>Arbiter</div>
                <div style={{ fontSize:10, color:T, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginTop:2 }}>reads every ticket</div>
              </div>
              {/* capability chips */}
              {[['search','Understands context'],['layers','Classifies & ranks'],['bolt','Prepares next steps']].map(([ic,lab]) => (
                <motion.div key={ic} whileInView={{ opacity:1, x:0 }} initial={{ opacity:0, x:20 }} viewport={{ once:true }}
                  transition={{ delay: 0.9 }}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:999,
                    background:'rgba(26,188,156,0.07)', border:'1px solid rgba(26,188,156,0.15)',
                    fontSize:11, fontWeight:600, color:T, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  <span className="mso" style={{ fontSize:13 }}>{ic}</span>{lab}
                </motion.div>
              ))}
            </motion.div>

            {/* RIGHT: sorted output + dual path */}
            <div style={{ position:'relative', height:420 }}>
              <motion.div initial={{ opacity:0, x:40 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ delay:0.6, duration:0.6 }}
                style={{ position:'absolute', top:0, left:0, right:0, bottom:0 }}>
                {/* triage complete label */}
                <div style={{ position:'absolute', top:0, right:0, textAlign:'right', zIndex:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:T, marginBottom:4 }}>Triage complete</div>
                  <div style={{ fontSize:12, color:'#475569' }}>Clear, prioritised queue</div>
                </div>
                {/* sorted list */}
                {[
                  { label:'Server down!',   badge:'Critical',  color:'#EF4444' },
                  { label:'Data breach?',   badge:'High',      color:'#F59E0B' },
                  { label:'VPN access',     badge:'Medium',    color:'#1ABC9C' },
                  { label:'Password reset', badge:'Low',       color:'#64748B' },
                  { label:'Wi-Fi issue',    badge:'Low',       color:'#64748B' },
                ].map((row,i) => (
                  <motion.div key={i}
                    initial={{ opacity:0, x:40 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }}
                    transition={{ delay: 0.8 + i*0.1, type:'spring', stiffness:140, damping:16 }}
                    style={{ position:'absolute', left:0, right:0, top: `${68 + i*64}px` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                      borderRadius:10, background:'rgba(15,30,26,0.9)',
                      border:`1px solid ${i===0?'rgba(239,68,68,0.4)':i===1?'rgba(245,158,11,0.3)':'rgba(26,188,156,0.12)'}`,
                      boxShadow: i===0?'0 4px 20px rgba(239,68,68,0.15)':'none' }}>
                      <motion.span style={{ width:8, height:8, borderRadius:'50%', background:row.color, flexShrink:0, display:'inline-block',
                        boxShadow:`0 0 6px ${row.color}` }}
                        animate={{ opacity: i<2?[1,0.4,1]:1 }} transition={{ duration:1.2, repeat:Infinity }} />
                      <span style={{ flex:1, fontSize:12, fontWeight:600, color:'#CBD5E1', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{row.label}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:row.color, padding:'2px 8px',
                        borderRadius:999, background:`${row.color}18`, letterSpacing:'0.06em' }}>{row.badge}</span>
                    </div>
                  </motion.div>
                ))}
                {/* bottom badge */}
                <motion.div initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ delay:1.4 }}
                  style={{ position:'absolute', bottom:8, left:0, right:0, padding:'10px 16px',
                    borderRadius:12, background:'rgba(26,188,156,0.08)', border:'1px solid rgba(26,188,156,0.2)',
                    display:'flex', alignItems:'center', gap:8 }}>
                  <span className="mso" style={{ fontSize:17, color:T }}>trending_up</span>
                  <div style={{ fontSize:12, color:'#94A3B8', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                    Less noise. More focus. <span style={{ color:T, fontWeight:700 }}>A more efficient IT team.</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* ── DUAL PATH EXPLAINER ── */}
          <motion.div initial={{ opacity:0, y:40 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:0.3, duration:0.7 }}
            style={{ marginTop:80, display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:24, alignItems:'stretch' }}>
            {/* Auto path */}
            <div style={{ padding:'28px 24px', borderRadius:16,
              background:'linear-gradient(135deg,rgba(26,188,156,0.06),rgba(26,188,156,0.02))',
              border:'1px solid rgba(26,188,156,0.18)', position:'relative', overflow:'hidden' }}>
              <motion.div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at top left,rgba(26,188,156,0.08),transparent 60%)', pointerEvents:'none' }} />
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(26,188,156,0.12)',
                  border:'1px solid rgba(26,188,156,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span className="mso" style={{ fontSize:18, color:T }}>check_circle</span>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#E2F8F3', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Routine &amp; safe</div>
                  <div style={{ fontSize:11, color:T, fontWeight:600 }}>Handled instantly by Arbiter</div>
                </div>
              </div>
              <p style={{ fontSize:13, color:'#64748B', lineHeight:1.7, marginBottom:16 }}>Password resets, Wi-Fi issues, standard access requests — resolved automatically with zero human intervention.</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {['Fast','Consistent','Reliable'].map(tag => (
                  <span key={tag} style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
                    padding:'3px 10px', borderRadius:999, background:'rgba(26,188,156,0.1)', color:T, border:'1px solid rgba(26,188,156,0.2)' }}>{tag}</span>
                ))}
              </div>
            </div>
            {/* Centre divider */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
              <div style={{ width:1, flex:1, background:'linear-gradient(to bottom,transparent,rgba(26,188,156,0.2),rgba(243,156,18,0.2),transparent)' }} />
              <div style={{ width:32, height:32, borderRadius:'50%',
                background:'rgba(15,25,22,0.95)', border:'1px solid rgba(240,253,249,0.1)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span className="mso" style={{ fontSize:14, color:'#475569' }}>call_split</span>
              </div>
              <div style={{ width:1, flex:1, background:'linear-gradient(to bottom,transparent,rgba(243,156,18,0.2),rgba(243,156,18,0.2),transparent)' }} />
            </div>
            {/* Human path */}
            <div style={{ padding:'28px 24px', borderRadius:16,
              background:'linear-gradient(135deg,rgba(243,156,18,0.06),rgba(243,156,18,0.02))',
              border:'1px solid rgba(243,156,18,0.18)', position:'relative', overflow:'hidden' }}>
              <motion.div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at top right,rgba(243,156,18,0.07),transparent 60%)', pointerEvents:'none' }} />
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(243,156,18,0.1)',
                  border:'1px solid rgba(243,156,18,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span className="mso" style={{ fontSize:18, color:A }}>person_raised_hand</span>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#E2F8F3', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Uncertain or risky</div>
                  <div style={{ fontSize:11, color:A, fontWeight:600 }}>Human decides — always</div>
                </div>
              </div>
              <p style={{ fontSize:13, color:'#64748B', lineHeight:1.7, marginBottom:16 }}>Anything smelling like real risk — security events, data access, high-impact changes — routes to your team immediately, no exceptions.</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {['Safe','Auditable','Transparent'].map(tag => (
                  <span key={tag} style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
                    padding:'3px 10px', borderRadius:999, background:'rgba(243,156,18,0.08)', color:A, border:'1px solid rgba(243,156,18,0.2)' }}>{tag}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding:'100px 40px', background:'rgba(26,188,156,0.02)', borderTop:'1px solid rgba(26,188,156,0.06)', borderBottom:'1px solid rgba(26,188,156,0.06)', position:'relative', overflow:'hidden' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <SectionLabel icon="schema">Workflow</SectionLabel>
          <SectionTitle>From ticket to action in seconds</SectionTitle>
          <SectionSub>A zero-friction pipeline. No changes to your Jira setup. No new tools to learn.</SectionSub>

          <div style={{ marginTop:72, display:'flex', flexDirection:'column', gap:0, position:'relative' }}>
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div key={step.step}
                initial={{ opacity:0, x: i%2===0 ? -50 : 50 }}
                whileInView={{ opacity:1, x:0 }}
                viewport={{ once:true }}
                transition={{ delay: i*0.13, duration:0.65, ease:[0.22,1,0.36,1] }}
                style={{ display:'flex', gap:0, paddingBottom: i === HOW_IT_WORKS.length-1 ? 0 : 0, position:'relative' }}>

                {/* Vertical connector */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{
                    position:'absolute', left:34, top:70, width:2, height:80,
                    background:`linear-gradient(to bottom,${step.color},${HOW_IT_WORKS[i+1].color}22)`,
                    zIndex:1,
                  }}>
                    <motion.div
                      animate={{ y:['-100%','120%'] }}
                      transition={{ duration:1.8, repeat:Infinity, ease:'linear', delay: i*0.4 }}
                      style={{ position:'absolute', width:'100%', height:'35%',
                        background:`linear-gradient(to bottom,transparent,${step.color},transparent)` }} />
                  </div>
                )}

                <div style={{ display:'flex', gap:28, flex:1, paddingBottom: i < HOW_IT_WORKS.length-1 ? 80 : 0 }}>
                  {/* Step node */}
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <motion.div
                      whileInView={{ scale:[0.7,1.15,1] }}
                      viewport={{ once:true }}
                      transition={{ delay: i*0.13+0.1, duration:0.5, type:'spring' }}
                      style={{ width:70, height:70, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                        background:`radial-gradient(circle,${step.color}22 0%,${step.color}08 100%)`,
                        border:`2px solid ${step.color}55`, position:'relative', zIndex:2 }}>
                      {/* pulse ring */}
                      <motion.div
                        animate={{ scale:[1,1.6], opacity:[0.5,0] }}
                        transition={{ duration:2, repeat:Infinity, delay: i*0.3 }}
                        style={{ position:'absolute', inset:0, borderRadius:'50%', border:`1px solid ${step.color}`, pointerEvents:'none' }} />
                      <span className="mso" style={{ fontSize:26, color:step.color }}>{step.icon}</span>
                    </motion.div>
                    {/* step number badge */}
                    <div style={{ position:'absolute', top:-4, right:-4, width:20, height:20, borderRadius:'50%',
                      background:step.color, display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:9, fontWeight:900, color:'#060D0B', fontFamily:"'JetBrains Mono',monospace", zIndex:3 }}>
                      {i+1}
                    </div>
                  </div>

                  {/* Content card */}
                  <motion.div
                    whileHover={{ y:-3, boxShadow:`0 12px 40px ${step.color}18` }}
                    style={{ flex:1, padding:'20px 24px', borderRadius:14,
                      background:'rgba(240,253,249,0.025)', border:`1px solid ${step.color}22`,
                      backdropFilter:'blur(8px)', transition:'all 0.2s', cursor:'default', overflow:'hidden', position:'relative' }}>
                    {/* animated data stream behind card */}
                    <motion.div
                      animate={{ x:['-110%','110%'] }}
                      transition={{ duration:3.5, repeat:Infinity, ease:'linear', delay: i*0.7 }}
                      style={{ position:'absolute', top:0, left:0, right:0, height:'100%',
                        background:`linear-gradient(90deg,transparent,${step.color}06,transparent)`,
                        pointerEvents:'none' }} />
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase',
                      color:step.color, marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>STEP {step.step}</div>
                    <h3 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:16, fontWeight:800,
                      color:'#E2F8F3', marginBottom:8, letterSpacing:'-0.02em' }}>{step.title}</h3>
                    <p style={{ fontSize:13.5, color:'#64748B', lineHeight:1.7, marginBottom:10 }}>{step.body}</p>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:999,
                      background:`${step.color}10`, border:`1px solid ${step.color}25` }}>
                      <span className="mso" style={{ fontSize:11, color:step.color }}>fiber_manual_record</span>
                      <span style={{ fontSize:11, color:step.color, fontWeight:600, fontFamily:"'JetBrains Mono',monospace" }}>{step.detail}</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section style={{ padding:'100px 40px' }}>
        <div style={{ maxWidth:1040, margin:'0 auto', textAlign:'center' }}>
          <SectionLabel icon="hub">Integrations</SectionLabel>
          <SectionTitle>The tools you already use</SectionTitle>
          <SectionSub>Arbiter slots into your existing stack. No migration, no new tools to learn.</SectionSub>
          <div style={{ display:'flex', justifyContent:'center', alignItems:'stretch', gap:20, marginTop:56, flexWrap:'wrap' }}>
            {[
              { icon: <JiraLogo size={34} />,  name:'Jira Service Management', role:'Ticket source and sync',      color:'rgba(38,132,255,0.15)' },
              { icon: <SlackLogo size={34} />, name:'Slack',                   role:'Alert and notification layer', color:'rgba(224,33,138,0.1)'  },
              { icon: <GroqIcon size={26} />,  name:'Groq',                    role:'Ultra-fast LLM inference',    color:'rgba(245,80,54,0.1)'   },
              { icon: <ClaudeLogo size={26} theme="dark" />, name:'Claude',     role:'Advanced AI reasoning',       color:'rgba(217,119,87,0.1)'  },
            ].map((int, i) => (
              <motion.div key={int.name}
                initial={{ opacity:0, y:30 }}
                whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }}
                transition={{ delay: i*0.1, type:'spring', stiffness:200 }}
                whileHover={{ y:-6, scale:1.03 }}
                style={{ flex:'1 1 200px', maxWidth:220 }}>
                <TiltCard style={{ padding:'28px 20px', borderRadius:16, textAlign:'center',
                  background: int.color, border:'1px solid rgba(240,253,249,0.08)',
                  backdropFilter:'blur(12px)', cursor:'default', height:'100%' }}>
                  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:48, marginBottom:14 }}>{int.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#F0FDF9', marginBottom:5,
                    fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1.3 }}>{int.name}</div>
                  <div style={{ fontSize:11.5, color:'#64748B', lineHeight:1.5 }}>{int.role}</div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ── ASK AI ABOUT ARBITER ── */}
      <AskAISection />

      {/* ── CTA ── */}
      <section style={{ padding: '100px 40px', borderTop: '1px solid rgba(26,188,156,0.08)', background: 'linear-gradient(180deg,transparent,rgba(26,188,156,0.04),transparent)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(26,188,156,0.08) 0%,transparent 70%)', filter: 'blur(60px)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}><ArbiterLogo size={72} animate="assemble" /></div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#F0FDF9', marginBottom: 16, lineHeight: 1.15 }}>
            Ready to automate your<br /><span className="shimmer-text">IT support?</span>
          </h2>
          <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.7, marginBottom: 36 }}>Connect your workspace in under 5 minutes. Free forever, open source, no credit card required.</p>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowLogin(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '16px 40px', borderRadius: 14, background: `linear-gradient(135deg,${T} 0%,${TD} 60%,rgba(243,156,18,0.5) 100%)`, border: `1px solid rgba(26,188,156,0.4)`, fontSize: 16, fontWeight: 800, color: 'white', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: `0 12px 40px rgba(26,188,156,0.45),inset 0 1px 0 rgba(255,255,255,0.2)`, transition: 'all 0.2s', letterSpacing: '-0.01em' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 20px 60px rgba(26,188,156,0.6),inset 0 1px 0 rgba(255,255,255,0.2)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 12px 40px rgba(26,188,156,0.45),inset 0 1px 0 rgba(255,255,255,0.2)`; }}>
            <span className="mso" style={{ fontSize: 22 }}>rocket_launch</span>Launch Arbiter — it&apos;s free
          </motion.button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '40px', borderTop: '1px solid rgba(240,253,249,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ArbiterLogo size={22} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Arbiter MCP</span>
          <span style={{ fontSize: 12, color: '#1E293B' }}>MIT License — 4ciki Solutions</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['GitHub', 'https://github.com/4ciki/arbiter-mcp'], ['Issues', 'https://github.com/4ciki/arbiter-mcp/issues'], ['License', 'https://github.com/4ciki/arbiter-mcp/blob/main/LICENSE']].map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#334155', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = T} onMouseLeave={e => e.currentTarget.style.color = '#334155'}>{label}</a>
          ))}
        </div>
      </footer>

      {/* ── LOGIN MODAL ── */}
      <AnimatePresence>
        {showLogin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowLogin(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,13,11,0.88)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ opacity: 0, y: 40, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.92 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              style={{ width: '100%', maxWidth: 420, background: '#0B1512', border: '1px solid rgba(26,188,156,0.2)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,0.7),0 0 0 1px rgba(26,188,156,0.06)' }}>
              <div style={{ height: 3, background: `linear-gradient(90deg,${T},${A})` }} />
              <div style={{ padding: '36px 36px 32px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowLogin(false)}
                    style={{ background: 'rgba(240,253,249,0.05)', border: '1px solid rgba(240,253,249,0.08)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,253,249,0.1)'; e.currentTarget.style.color = '#F0FDF9'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(240,253,249,0.05)'; e.currentTarget.style.color = '#64748B'; }}>
                    <span className="mso" style={{ fontSize: 16 }}>close</span>
                  </motion.button>
                </div>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><ArbiterLogo size={56} animate="gyro" /></div>
                  <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: '#F0FDF9', letterSpacing: '-0.03em', marginBottom: 8 }}>Sign in to Arbiter</h2>
                  <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>Your session is encrypted and audit-logged.</p>
                </div>
                <motion.button whileTap={{ scale: 0.98 }} onClick={handle} disabled={busy}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 20px', borderRadius: 12, background: busy ? 'rgba(240,253,249,0.03)' : 'rgba(240,253,249,0.06)', border: `1px solid ${busy ? 'rgba(240,253,249,0.06)' : 'rgba(240,253,249,0.14)'}`, fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", color: busy ? '#475569' : '#F0FDF9', cursor: busy ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = 'rgba(240,253,249,0.1)'; e.currentTarget.style.borderColor = 'rgba(26,188,156,0.3)'; }}}
                  onMouseLeave={e => { e.currentTarget.style.background = busy ? 'rgba(240,253,249,0.03)' : 'rgba(240,253,249,0.06)'; e.currentTarget.style.borderColor = busy ? 'rgba(240,253,249,0.06)' : 'rgba(240,253,249,0.14)'; }}>
                  {busy ? <Loader2 size={18} color={T} style={{ animation: 'spin 0.9s linear infinite' }} /> : <GoogleIcon />}
                  {busy ? 'Authenticating…' : 'Continue with Google'}
                </motion.button>
                <AnimatePresence>
                  {err && (
                    <motion.div initial={{ opacity: 0, y: 6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13, color: '#FCA5A5', lineHeight: 1.5 }}>
                      <span className="mso" style={{ fontSize: 14, marginRight: 6, verticalAlign: 'middle' }}>error</span>{err}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div style={{ marginTop: 24, fontSize: 11, color: '#334155', textAlign: 'center', lineHeight: 1.7 }}>
                  By signing in you agree that all activity is logged for security and compliance. Arbiter MCP is open source under the MIT licence.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function NavLink({ href, children }) {
  return (
    <a href={href} style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#64748B', textDecoration: 'none', borderRadius: 8, transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#F0FDF9'; e.currentTarget.style.background = 'rgba(240,253,249,0.05)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </a>
  );
}
function SectionLabel({ icon, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 999, background: 'rgba(26,188,156,0.08)', border: '1px solid rgba(26,188,156,0.15)', marginBottom: 16 }}>
      <span className="mso" style={{ fontSize: 14, color: T }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: T, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{children}</span>
    </motion.div>
  );
}
function SectionTitle({ children }) {
  return (
    <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.05 }}
      style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#F0FDF9', marginBottom: 12, lineHeight: 1.15 }}>
      {children}
    </motion.h2>
  );
}
function SectionSub({ children }) {
  return (
    <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
      style={{ fontSize: 16, color: '#64748B', lineHeight: 1.7, maxWidth: 560 }}>
      {children}
    </motion.p>
  );
}
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
