import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Zap, TrendingUp } from 'lucide-react';
import ArbiterLogo from '../components/ArbiterLogo';
import { JiraLogo, SlackLogo } from '../components/BrandLogos';

const ERR = {
  'auth/popup-blocked':        'Pop-up was blocked — allow pop-ups for this page and retry.',
  'auth/popup-closed-by-user': 'Sign-in cancelled. Please try again.',
  'auth/network-request-failed':'Network error — check your internet connection.',
  'auth/unauthorized-domain':  'This domain is not authorised in Firebase. Add it in the Firebase console.',
};

export default function LoginScreen({ signIn }) {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  const handle = async () => {
    setBusy(true); setErr('');
    // Safety: reset after 12s no matter what (popup closed without firing error)
    const timer = setTimeout(() => {
      setBusy(false);
    }, 12000);
    try {
      await signIn();
      clearTimeout(timer);
      setBusy(false);
    } catch (e) {
      clearTimeout(timer);
      setBusy(false);
      if (e?.code === 'auth/popup-closed-by-user') {
        // User voluntarily dismissed popup
        setErr('Sign-in cancelled. Please click below to try again.');
      } else {
        setErr(ERR[e?.code] || e?.message || 'Authentication failed — please try again.');
      }
    }
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex',
      background:'linear-gradient(135deg,#F0F4FF 0%,#FAFAFA 50%,#FFF8F0 100%)',
      overflow:'hidden',
    }}>
      {/* Left decorative column */}
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',
        padding:'60px 80px', position:'relative', overflow:'hidden',
      }}>
        {/* Background blobs */}
        <div style={{position:'absolute',top:-100,left:-100,width:400,height:400,borderRadius:'50%',
          background:'radial-gradient(circle,rgba(79,70,229,0.08) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-80,left:80,width:300,height:300,borderRadius:'50%',
          background:'radial-gradient(circle,rgba(245,158,11,0.07) 0%,transparent 70%)',pointerEvents:'none'}}/>

        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
          {/* Animated hero icon with ping rings */}
          <div style={{position:'relative',display:'inline-flex',marginBottom:36}}>
            {/* Outer ping ring — teal */}
            <div style={{position:'absolute',inset:-16,borderRadius:'50%',
              border:'2px solid rgba(26,188,156,0.3)',
              animation:'icon-ping 2.4s ease-out infinite'}}/>
            {/* Inner ping ring — amber */}
            <div style={{position:'absolute',inset:-8,borderRadius:'50%',
              border:'1.5px solid rgba(243,156,18,0.25)',
              animation:'icon-ping 2.4s ease-out 0.5s infinite'}}/>
            <ArbiterLogo size={88} animate="assemble" />
          </div>

          <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:40,fontWeight:800,
            color:'#0F172A',lineHeight:1.15,letterSpacing:'-0.03em',marginBottom:16}}>
            Arbiter MCP<br/>
            <span style={{color:'#4F46E5'}}>Admin Console</span>
          </h1>

          <p style={{fontSize:16,color:'#475569',lineHeight:1.7,maxWidth:380,marginBottom:40}}>
            The open-source AI-powered helpdesk triage engine.
            Connect Jira, Slack, and Groq to automate your IT support workflow.
          </p>

          {/* Feature pills */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[
              { label:'AI Triage',          lucide:<Zap size={13} color="#D97706" /> },
              { label:'Jira Integration',    lucide:<JiraLogo size={13} /> },
              { label:'Slack Notifications', lucide:<SlackLogo size={13} /> },
              { label:'Real-time Analytics', lucide:<TrendingUp size={13} color="#2563EB" /> },
            ].map(f => (
              <span key={f.label} style={{
                display:'inline-flex',alignItems:'center',gap:6,
                padding:'6px 12px',background:'white',border:'1px solid #E4E9F2',
                borderRadius:999,fontSize:12,fontWeight:600,color:'#334155',
                boxShadow:'0 1px 3px rgba(15,23,42,0.04)',
                fontFamily:"'Plus Jakarta Sans',sans-serif",
              }}>
                {f.lucide}
                {f.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Divider */}
      <div style={{width:1,background:'linear-gradient(to bottom,transparent,#E4E9F2,transparent)',flexShrink:0}}/>

      {/* Right — sign-in panel */}
      <div style={{width:480,display:'flex',alignItems:'center',justifyContent:'center',
        padding:48,background:'white',boxShadow:'-20px 0 60px rgba(15,23,42,0.04)'}}>
        <motion.div
          initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}
          transition={{duration:0.5,delay:0.1}}
          style={{width:'100%',maxWidth:360}}
        >
          <div style={{marginBottom:32}}>
            <div style={{fontSize:24,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",
              color:'#0F172A',letterSpacing:'-0.02em',marginBottom:8}}>
              Sign in to continue
            </div>
            <div style={{fontSize:14,color:'#94A3B8'}}>
              Your session is encrypted and audited.
            </div>
          </div>

          <button
            onClick={handle} disabled={busy}
            style={{
              width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              padding:'13px 20px',
              background: busy ? '#F8FAFC' : 'white',
              border:'1.5px solid #E4E9F2', borderRadius:10,
              fontSize:14, fontWeight:600, fontFamily:"'Inter',sans-serif",
              color:'#0F172A', cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: busy ? 'none' : '0 2px 8px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
              transition:'all 0.15s',
            }}
            onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor='#4F46E5'; e.currentTarget.style.boxShadow='0 4px 16px rgba(79,70,229,0.12),inset 0 1px 0 white'; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#E4E9F2'; e.currentTarget.style.boxShadow='0 2px 8px rgba(15,23,42,0.06),inset 0 1px 0 rgba(255,255,255,0.9)'; }}
          >
            {busy
              ? <Loader2 size={18} color="#4F46E5" style={{animation:'spin 0.9s linear infinite'}} />
              : <GoogleIcon />
            }
            {busy ? 'Authenticating…' : 'Continue with Google'}
          </button>

          {err && (
            <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
              style={{marginTop:14,padding:'10px 14px',background:'#FEF2F2',
                border:'1px solid #FECACA',borderRadius:8,
                fontSize:13,color:'#991B1B',lineHeight:1.5}}>
              {err}
            </motion.div>
          )}

          <div style={{marginTop:32,paddingTop:24,borderTop:'1px solid #F1F5F9',
            fontSize:12,color:'#94A3B8',textAlign:'center',lineHeight:1.6}}>
            By signing in you agree that all activity is logged for security and compliance.
            Arbiter MCP is open source under the MIT licence.
          </div>
        </motion.div>
      </div>
    </div>
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