import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import ArbiterLogo from '../components/ArbiterLogo';
import { JiraLogo, SlackLogo, GroqIcon, ClaudeLogo } from '../components/BrandLogos';

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
  { step: '01', icon: 'task_alt',  title: 'Ticket Created in Jira', body: 'Your team raises a support ticket in Jira Service Management as usual — no workflow changes required.' },
  { step: '02', icon: 'webhook',   title: 'Webhook Fires Instantly', body: "Arbiter's webhook endpoint receives the event in real time and queues it for AI analysis." },
  { step: '03', icon: 'smart_toy', title: 'AI Agent Triages',        body: 'The LangGraph agent analyses severity, category, affected systems, and SLA risk using your chosen LLM.' },
  { step: '04', icon: 'send',      title: 'Slack Alert Dispatched',  body: 'A rich Slack notification lands in the right channel with full context, links, and AI-recommended next steps.' },
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
        .shimmer-text { background:linear-gradient(90deg,#1ABC9C,#F39C12,#1ABC9C); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:shimmer 3s linear infinite; }
        .glow-btn { animation:glow-pulse 3s ease-in-out infinite; }
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

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '100px 40px', background: 'rgba(26,188,156,0.02)', borderTop: '1px solid rgba(26,188,156,0.06)', borderBottom: '1px solid rgba(26,188,156,0.06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: 'linear-gradient(to bottom,transparent,rgba(26,188,156,0.08),transparent)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <SectionLabel icon="schema">Workflow</SectionLabel>
          <SectionTitle>From ticket to action in seconds</SectionTitle>
          <SectionSub>A zero-friction pipeline that requires no changes to your existing Jira setup.</SectionSub>
          <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column' }}>
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div key={step.step} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'flex', gap: 28, paddingBottom: i === HOW_IT_WORKS.length - 1 ? 0 : 48, position: 'relative' }}>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{ position: 'absolute', left: 22, top: 52, width: 2, bottom: 0, background: 'linear-gradient(to bottom,rgba(26,188,156,0.3),rgba(243,156,18,0.1))' }}>
                    <motion.div animate={{ y: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
                      style={{ position: 'absolute', width: '100%', height: '30%', background: `linear-gradient(to bottom,transparent,${T},transparent)` }} />
                  </div>
                )}
                <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i % 2 === 0 ? 'rgba(26,188,156,0.1)' : 'rgba(243,156,18,0.1)', border: `1.5px solid ${i % 2 === 0 ? 'rgba(26,188,156,0.3)' : 'rgba(243,156,18,0.3)'}`, position: 'relative', zIndex: 2 }}>
                  <span className="mso" style={{ fontSize: 20, color: i % 2 === 0 ? T : A }}>{step.icon}</span>
                </div>
                <div style={{ flex: 1, paddingTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: i % 2 === 0 ? T : A, marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>{step.step}</div>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 17, fontWeight: 800, color: '#E2F8F3', marginBottom: 8, letterSpacing: '-0.02em' }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, maxWidth: 560 }}>{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section style={{ padding: '100px 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <SectionLabel icon="hub">Integrations</SectionLabel>
          <SectionTitle>The tools you already use</SectionTitle>
          <SectionSub>Arbiter slots into your existing stack. No migration, no new tools to learn.</SectionSub>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 60, flexWrap: 'wrap' }}>
            {[
              { icon: <JiraLogo size={36} />,  name: 'Jira Service Management', role: 'Ticket source and sync'     },
              { icon: <SlackLogo size={36} />, name: 'Slack',                   role: 'Alert and notification layer'},
              { icon: <GroqIcon size={28} />,  name: 'Groq',                    role: 'Ultra-fast LLM inference'   },
              { icon: <ClaudeLogo size={28} theme="dark" />,name: 'Claude',      role: 'Advanced AI reasoning'      },
            ].map((int, i) => (
              <motion.div key={int.name} initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }} whileHover={{ y: -6, scale: 1.02 }}>
                <TiltCard style={{ padding: '28px 32px', borderRadius: 16, textAlign: 'center', background: 'rgba(240,253,249,0.03)', border: '1px solid rgba(240,253,249,0.08)', backdropFilter: 'blur(12px)', width: 200, cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 44, marginBottom: 16 }}>{int.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#F0FDF9', marginBottom: 4, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{int.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>{int.role}</div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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