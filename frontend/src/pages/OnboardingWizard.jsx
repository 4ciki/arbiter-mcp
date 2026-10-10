import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import ArbiterLogo from '../components/ArbiterLogo';
import { JiraLogo, SlackLogo, GroqLogo, GroqIcon, ClaudeLogo, RenderLogo, DatabaseLogo, ServiceBrandIcon } from '../components/BrandLogos';
import {
  getLocalConfig,
  saveLocalConfig,
  saveBackendConfig,
  saveFirestoreConfig,
  mergeConfigs
} from '../data/configStorage';


import { getApiBase } from '../data/apiConfig';

const API_BASE = getApiBase();


const STEPS = [
  { id:'welcome',  title:'Welcome to Arbiter MCP',    sub:'Set up your AI helpdesk agent in minutes' },
  { id:'jira',     title:'Jira Service Management',   sub:'Receive and triage IT tickets automatically' },
  { id:'slack',    title:'Slack Workspace',           sub:'Get instant agent notifications in Slack' },
  { id:'llm',      title:'AI Engine',                 sub:'Choose your LLM provider to power triage' },
  { id:'done',     title:'You are all set!',          sub:'Your Arbiter console is configured and ready' },
];

const GUIDES = {
  jira: {
    title: 'How to get your Jira credentials',
    steps: [
      { icon:'open_in_new', text:'Go to id.atlassian.com and sign in to your Atlassian account.' },
      { icon:'manage_accounts', text:'Click your profile picture (top right) → Manage account.' },
      { icon:'security', text:'Select the Security tab from the left navigation.' },
      { icon:'key', text:'Under "API tokens", click Create API token.' },
      { icon:'label', text:'Give it a name (e.g. "Arbiter MCP") and click Create.' },
      { icon:'content_copy', text:'Copy the token immediately — it will not be shown again.' },
      { icon:'language', text:'Your Site URL is your Atlassian domain: https://yourcompany.atlassian.net' },
    ],
    link: { label:'Open Atlassian API Tokens', url:'https://id.atlassian.com/manage-profile/security/api-tokens', type:'jira' },
  },
  slack: {
    title: 'How to create a Slack app',
    steps: [
      { icon:'open_in_new', text:'Go to api.slack.com/apps and click Create New App.' },
      { icon:'tune', text:'Choose "From scratch", give it a name, and select your workspace.' },
      { icon:'settings', text:'Under OAuth & Permissions, add these Bot Token Scopes: channels:read, chat:write, users:read.' },
      { icon:'install_mobile', text:'Click "Install to Workspace" and authorise the permissions.' },
      { icon:'key', text:'Copy the Bot User OAuth Token — it starts with xoxb-.' },
      { icon:'lock', text:'Your Signing Secret is under Basic Information → App Credentials.' },
    ],
    link: { label:'Open Slack API Dashboard', url:'https://api.slack.com/apps', type:'slack' },
  },
  llm: {
    title: 'Choosing your AI provider',
    steps: [
      { icon:'speed', text:'Groq: Ultra-fast inference with Llama models. Free tier available. Best for high-volume triage.' },
      { icon:'psychology', text:'Claude: Anthropic\'s frontier model. Better reasoning for complex escalations. Paid API.' },
      { icon:'key', text:'You only need one provider — pick the one you already have access to.' },
      { icon:'settings_backup_restore', text:'You can change your provider any time from the Credentials page.' },
    ],
    link: null,
  },
};

const INIT = {
  jira:     { site_url:'', email:'', api_token:'' },
  slack:    { bot_token:'', signing_secret:'', channel:'#general' },
  llm:      { provider:'groq', api_key:'' },
};

function Field({ label, hint, value, onChange, type='text', placeholder='' }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{marginBottom:16}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,letterSpacing:'0.07em',
        textTransform:'uppercase',color:'#64748B',marginBottom:6,
        fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
        {label}
      </label>
      <div style={{position:'relative'}}>
        <input
          type={type==='password'&&!show?'password':'text'}
          value={value}
          onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width:'100%',padding:'10px 14px',
            background:'#FFFFFF',border:'1.5px solid #E4E9F2',borderRadius:8,
            color:'#0F172A',fontFamily:"'Inter',sans-serif",fontSize:13.5,
            boxShadow:'0 1px 2px rgba(15,23,42,0.04)',outline:'none',boxSizing:'border-box',
            paddingRight:type==='password'?40:14,transition:'border-color 0.15s,box-shadow 0.15s',
          }}
          onFocus={e=>{e.target.style.borderColor='#4F46E5';e.target.style.boxShadow='0 0 0 3px rgba(79,70,229,0.1)';}}
          onBlur={e=>{e.target.style.borderColor='#E4E9F2';e.target.style.boxShadow='0 1px 2px rgba(15,23,42,0.04)';}}
        />
        {type==='password'&&(
          <button onClick={()=>setShow(s=>!s)} type="button" style={{
            position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
            background:'none',border:'none',cursor:'pointer',color:'#94A3B8',
            fontFamily:'Material Symbols Outlined',fontSize:17,
            fontVariationSettings:"'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 20",
          }}>
            {show?'visibility_off':'visibility'}
          </button>
        )}
      </div>
      {hint&&<div style={{fontSize:11,color:'#94A3B8',marginTop:5,lineHeight:1.5}}>{hint}</div>}
    </div>
  );
}

function TestBtn({ status, onTest }) {
  const s = {
    idle:    {bg:'white',border:'#E4E9F2',color:'#475569',icon:'wifi_tethering'},
    testing: {bg:'#EEF2FF',border:'#C7D2FE',color:'#4F46E5',icon:'progress_activity'},
    ok:      {bg:'#ECFDF5',border:'#A7F3D0',color:'#065F46',icon:'check_circle'},
    error:   {bg:'#FEF2F2',border:'#FECACA',color:'#991B1B',icon:'cancel'},
  }[status]||{bg:'white',border:'#E4E9F2',color:'#475569',icon:'wifi_tethering'};
  return (
    <motion.button whileTap={{scale:0.97}} onClick={onTest} disabled={status==='testing'}
      style={{
        display:'flex',alignItems:'center',gap:6,padding:'8px 14px',
        background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:8,
        fontSize:12,fontWeight:700,letterSpacing:'0.06em',fontFamily:"'Plus Jakarta Sans',sans-serif",
        color:s.color,cursor:status==='testing'?'not-allowed':'pointer',
        boxShadow:'0 1px 3px rgba(15,23,42,0.06)',textTransform:'uppercase',
        transition:'all 0.15s',
      }}>
      <span className="mso sm" style={{animation:status==='testing'?'spin 0.9s linear infinite':'none'}}>
        {s.icon}
      </span>
      {status==='testing'?'Testing…':'Test Connection'}
    </motion.button>
  );
}

function GuidePanel({ guide }) {
  if (!guide) return (
    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:32}}>
      <ArbiterLogo size={52} animate />
      <div style={{fontSize:14,fontWeight:600,color:'#0F172A',textAlign:'center',
        fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Arbiter MCP</div>
      <div style={{fontSize:12,color:'#94A3B8',textAlign:'center',maxWidth:220,lineHeight:1.6}}>
        Connect your services to enable AI-powered IT helpdesk automation.
      </div>
    </div>
  );
  return (
    <div style={{flex:1,padding:'22px 22px',overflowY:'auto'}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',
        color:'#6366F1',marginBottom:10,fontFamily:"'Plus Jakarta Sans',sans-serif",display:'flex',alignItems:'center',gap:6}}>
        <span className="mso sm" style={{fontSize:15}}>help_outline</span>
        Quick Guide
      </div>
      <div style={{fontSize:14,fontWeight:700,color:'#0F172A',
        fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14,lineHeight:1.4}}>
        {guide.title}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:9}}>
        {guide.steps.map((step,i)=>(
          <motion.div key={i}
            initial={{opacity:0,x:10}} animate={{opacity:1,x:0}}
            transition={{delay:i*0.04,duration:0.25}}
            style={{display:'flex',alignItems:'flex-start',gap:9}}>
            <div style={{
              width:26,height:26,borderRadius:7,flexShrink:0,
              background:'#EEF2FF',border:'1px solid #C7D2FE',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span className="mso sm" style={{fontSize:14,color:'#4F46E5'}}>{step.icon}</span>
            </div>
            <div style={{fontSize:12,color:'#475569',lineHeight:1.55,paddingTop:2}}>{step.text}</div>
          </motion.div>
        ))}
      </div>
      {guide.link&&(
        <a href={guide.link.url} target="_blank" rel="noreferrer"
          style={{
            display:'inline-flex',alignItems:'center',gap:8,marginTop:14,
            padding:'8px 14px',background:'#EEF2FF',border:'1px solid #C7D2FE',
            borderRadius:8,fontSize:12,fontWeight:600,color:'#4F46E5',
            fontFamily:"'Plus Jakarta Sans',sans-serif",textDecoration:'none',
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.background='#E0E7FF';}}
          onMouseLeave={e=>{e.currentTarget.style.background='#EEF2FF';}}>
          {guide.link.type ? <ServiceBrandIcon type={guide.link.type} size={16} /> : <span className="mso sm">open_in_new</span>}
          {guide.link.label}
          <span className="mso sm" style={{fontSize:13,opacity:0.6,marginLeft:'auto'}}>open_in_new</span>
        </a>
      )}
    </div>
  );
}

// ── LLM Provider Picker ─────────────────────────────────────────────────────
function LLMStep({ provider, apiKey, onProviderChange, onKeyChange, testStatus, testMsg, onTest }) {
  const isGroq   = provider === 'groq';
  const isClaude = provider === 'claude';

  const cardStyle = (active, accent) => ({
    flex:1, padding:'16px 18px', borderRadius:12, cursor:'pointer',
    border:`2px solid ${active ? accent : '#E4E9F2'}`,
    background: active ? (accent === '#4F46E5' ? '#EEF2FF' : '#FFF7ED') : 'white',
    transition:'all 0.18s',
    boxShadow: active ? `0 0 0 3px ${accent}22` : '0 1px 3px rgba(15,23,42,0.04)',
  });

  return (
    <div style={{padding:'20px 28px',flex:1}}>
      {/* Provider cards */}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        {/* Groq card */}
        <motion.div whileTap={{scale:0.98}} style={cardStyle(isGroq,'#F55036')}
          onClick={()=>onProviderChange('groq')}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <div style={{width:36,height:36,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <GroqIcon size={32} />
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",
                color:isGroq?'#C0341D':'#0F172A'}}>Groq</div>
              <div style={{fontSize:10,color:'#64748B',fontWeight:500}}>Llama · Ultra-fast</div>
            </div>
            {isGroq && <span className="mso fill sm" style={{marginLeft:'auto',fontSize:18,color:'#F55036'}}>radio_button_checked</span>}
            {!isGroq && <span className="mso sm" style={{marginLeft:'auto',fontSize:18,color:'#CBD5E1'}}>radio_button_unchecked</span>}
          </div>
          <div style={{fontSize:11,color:'#64748B',lineHeight:1.5}}>
            Free tier available. Fastest inference for high-volume IT triage.
          </div>
        </motion.div>

        {/* Claude card */}
        <motion.div whileTap={{scale:0.98}} style={cardStyle(isClaude,'#CC9B7A')}
          onClick={()=>onProviderChange('claude')}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <div style={{width:36,height:36,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <ClaudeLogo size={28} theme="light" iconOnly />
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",
                color:isClaude?'#7C5535':'#0F172A'}}>Claude</div>
              <div style={{fontSize:10,color:'#64748B',fontWeight:500}}>Anthropic · Frontier</div>
            </div>
            {isClaude && <span className="mso fill sm" style={{marginLeft:'auto',fontSize:18,color:'#CC9B7A'}}>radio_button_checked</span>}
            {!isClaude && <span className="mso sm" style={{marginLeft:'auto',fontSize:18,color:'#CBD5E1'}}>radio_button_unchecked</span>}
          </div>
          <div style={{fontSize:11,color:'#64748B',lineHeight:1.5}}>
            Frontier reasoning. Best for complex escalation judgments.
          </div>
        </motion.div>
      </div>

      {/* Dynamic API key field */}
      <AnimatePresence mode="wait">
        <motion.div key={provider}
          initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
          transition={{duration:0.18}}>
          {isGroq && (
            <Field label="Groq API Key" type="password" placeholder="gsk_..."
              value={apiKey} onChange={onKeyChange}
              hint="Starts with gsk_ · Free tier at console.groq.com/keys" />
          )}
          {isClaude && (
            <Field label="Anthropic API Key" type="password" placeholder="sk-ant-..."
              value={apiKey} onChange={onKeyChange}
              hint="Starts with sk-ant- · Get it at console.anthropic.com" />
          )}
        </motion.div>
      </AnimatePresence>

      <div style={{display:'flex',alignItems:'center',gap:12,marginTop:4}}>
        <TestBtn status={testStatus||'idle'} onTest={onTest} />
        {testMsg&&<span style={{fontSize:12,color:testStatus==='ok'?'#065F46':'#991B1B'}}>{testMsg}</span>}
      </div>
    </div>
  );
}

export default function OnboardingWizard({ user, onComplete }) {
  const [step, setStep]     = useState(0);
  const [creds, setCreds]   = useState(() => mergeConfigs(INIT, getLocalConfig(user?.uid) || {}));
  const [tests, setTests]   = useState({});
  const [testMsg, setTestMsg] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (sec,key,val) => setCreds(c=>({...c,[sec]:{...c[sec],[key]:val}}));
  const stepId = STEPS[step].id;

  async function testCred(type, payload) {
    setTests(t=>({...t,[type]:'testing'})); setTestMsg(m=>({...m,[type]:''}));
    try {
      const r = await fetch(`${API_BASE}/api/test-credential`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type,...payload}),
      });
      const d = await r.json();
      setTests(t=>({...t,[type]:d.ok?'ok':'error'}));
      setTestMsg(m=>({...m,[type]:d.message||''}));
    } catch {
      setTests(t=>({...t,[type]:'error'}));
      setTestMsg(m=>({...m,[type]:'Cannot reach the Arbiter backend. Check your deploy URL.'}));
    }
  }

  async function finish() {
    setSaving(true);
    try {
      const payload = mergeConfigs(creds, {
        configured: true,
        updatedAt: new Date().toISOString(),
      });

      // 1. Instant local persistence (survives Render restarts)
      saveLocalConfig(user.uid, payload);

      // 2. Parallel sync to Backend and Firestore
      await Promise.allSettled([
        saveBackendConfig(API_BASE, user.uid, payload),
        saveFirestoreConfig(db, user.uid, payload),
      ]);

      toast.success('Configuration saved!');
      onComplete(payload);
    } catch {
      toast.error('Save failed — please try again.');
    } finally {
      setSaving(false);
    }
  }

  const isLast = step===STEPS.length-1;
  const canSkip = false;

  const formContent = {
    welcome:(
      <div style={{padding:'24px 32px',flex:1}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',paddingTop:18}}>
          <div style={{marginBottom:24}}>
            <ArbiterLogo size={76} animate="assemble" />
          </div>
          <div style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",
            color:'#0F172A',letterSpacing:'-0.02em',marginBottom:12}}>
            Let's set up Arbiter
          </div>
          <div style={{fontSize:14,color:'#475569',lineHeight:1.8,maxWidth:320,marginBottom:32}}>
            This wizard will guide you through connecting Jira, Slack, your AI engine,
            and your database — each takes about 2 minutes.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,width:'100%',maxWidth:360}}>
            {[
              {brand:'jira',     label:'Jira Service',   color:'#EEF2FF', border:'#C7D2FE' },
              {brand:'slack',    label:'Slack Alerts',   color:'#F8FAFC', border:'#E2E8F0' },
              {brand:'groq-claude', label:'Groq / Claude', color:'#FFF7ED', border:'#FDBA74' },
              {icon:'auto_awesome', label:'AI Triage',   color:'#F0FDF4', border:'#BBF7D0', text:'#059669'},
            ].map(f=>(
              <div key={f.label} style={{
                display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
                background:f.color,border:`1px solid ${f.border}`,borderRadius:10,
                boxShadow:'0 1px 3px rgba(15,23,42,0.03)',
              }}>
                {f.brand === 'groq-claude' ? (
                  <div style={{display:'flex',gap:2}}>
                    <GroqIcon size={18}/>
                    <ClaudeLogo size={18} theme="light" iconOnly />
                  </div>
                ) : f.brand ? (
                  <ServiceBrandIcon type={f.brand} size={20} />
                ) : (
                  <span className="mso fill sm" style={{color:f.text,fontSize:18}}>{f.icon}</span>
                )}
                <span style={{fontSize:12.5,fontWeight:700,color:'#0F172A',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    jira:(
      <div style={{padding:'24px 32px',flex:1}}>
        <Field label="Jira Site URL" placeholder="https://yourcompany.atlassian.net"
          value={creds.jira.site_url} onChange={v=>update('jira','site_url',v)}
          hint="Your Atlassian subdomain"/>
        <Field label="Account Email" placeholder="you@company.com"
          value={creds.jira.email} onChange={v=>update('jira','email',v)}/>
        <Field label="API Token" type="password" placeholder="ATATT3x..."
          value={creds.jira.api_token} onChange={v=>update('jira','api_token',v)}
          hint="Generate at id.atlassian.com → Security → API Tokens"/>
        <div style={{display:'flex',alignItems:'center',gap:12,marginTop:4}}>
          <TestBtn status={tests.jira||'idle'} onTest={()=>testCred('jira',creds.jira)}/>
          {testMsg.jira&&<span style={{fontSize:12,color:tests.jira==='ok'?'#065F46':'#991B1B'}}>{testMsg.jira}</span>}
        </div>
      </div>
    ),
    slack:(
      <div style={{padding:'24px 32px',flex:1}}>
        <Field label="Bot User OAuth Token" type="password" placeholder="xoxb-..."
          value={creds.slack.bot_token} onChange={v=>update('slack','bot_token',v)}
          hint="Starts with xoxb- · Found in OAuth & Permissions"/>
        <Field label="Signing Secret" type="password" placeholder="6878..."
          value={creds.slack.signing_secret} onChange={v=>update('slack','signing_secret',v)}
          hint="Under Basic Information → App Credentials"/>
        <Field label="Default Channel" placeholder="#it-support"
          value={creds.slack.channel} onChange={v=>update('slack','channel',v)}/>
        <div style={{display:'flex',alignItems:'center',gap:12,marginTop:4}}>
          <TestBtn status={tests.slack||'idle'} onTest={()=>testCred('slack',{bot_token:creds.slack.bot_token})}/>
          {testMsg.slack&&<span style={{fontSize:12,color:tests.slack==='ok'?'#065F46':'#991B1B'}}>{testMsg.slack}</span>}
        </div>
      </div>
    ),
    llm:(
      <LLMStep
        provider={creds.llm.provider}
        apiKey={creds.llm.api_key}
        onProviderChange={v=>update('llm','provider',v)}
        onKeyChange={v=>update('llm','api_key',v)}
        testStatus={tests[creds.llm.provider]||'idle'}
        testMsg={testMsg[creds.llm.provider]||''}
        onTest={()=>testCred(creds.llm.provider,{api_key:creds.llm.api_key})}
      />
    ),

    done:(
      <div style={{padding:'24px 32px',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:260,damping:20}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:'#ECFDF5',border:'2px solid #A7F3D0',
            display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <span className="mso fill" style={{fontSize:36,color:'#059669'}}>check_circle</span>
          </div>
        </motion.div>
        <div style={{fontSize:20,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",
          color:'#0F172A',marginBottom:10}}>All configured!</div>
        <div style={{fontSize:13,color:'#64748B',lineHeight:1.7,maxWidth:280}}>
          Your credentials are saved. Arbiter will use them to connect to your services.
          You can update them anytime from the <strong>Credentials</strong> page.
        </div>
      </div>
    ),
  };

  return (
    <div style={{
      minHeight:'100vh',
      display:'flex',
      flexDirection:'column',
      alignItems:'center',
      justifyContent:'flex-start',
      background:'linear-gradient(135deg,#F0F4FF 0%,#FAFAFA 50%,#FFF8F0 100%)',
      padding:'32px 20px 80px',
      boxSizing:'border-box',
      overflowY:'auto',
      width:'100%',
    }}>
      {/* Background blobs */}
      <div style={{position:'fixed',top:'-10%',right:'-5%',width:400,height:400,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(79,70,229,0.06) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <div style={{position:'fixed',bottom:'-5%',left:'-5%',width:350,height:350,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(245,158,11,0.05) 0%,transparent 70%)',pointerEvents:'none'}}/>

      <div style={{width:'100%',maxWidth:840,margin:'auto 0'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
          <ArbiterLogo size={32} animate="gyro"/>
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,fontWeight:700,
            color:'#0F172A',letterSpacing:'-0.01em'}}>Arbiter MCP</span>
          <span style={{marginLeft:'auto',fontSize:12,color:'#94A3B8',fontFamily:"'Inter',sans-serif"}}>
            Signed in as {user.displayName}
          </span>
        </div>

        {/* Progress */}
        <div style={{display:'flex',gap:4,marginBottom:8}}>
          {STEPS.map((_,i)=>(
            <div key={i} style={{flex:1,height:3,borderRadius:2,
              background:i<=step?'#4F46E5':'#E4E9F2',
              boxShadow:i<=step?'0 0 6px rgba(79,70,229,0.35)':'none',
              transition:'all 0.3s'}}/>
          ))}
        </div>
        <div style={{fontSize:11,color:'#94A3B8',marginBottom:20,fontFamily:"'Inter',sans-serif"}}>
          Step {step+1} of {STEPS.length}
        </div>

        {/* Main card */}
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{opacity:0,x:16}} animate={{opacity:1,x:0}}
            exit={{opacity:0,x:-16}} transition={{duration:0.2}}
            style={{
              background:'white',borderRadius:16,border:'1px solid #E4E9F2',
              boxShadow:'0 8px 32px rgba(15,23,42,0.08)',
              overflow:'hidden',
            }}>
            {/* Card top */}
            <div style={{padding:'22px 32px 18px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:14}}>
              {stepId !== 'welcome' && stepId !== 'done' && stepId !== 'llm' && (
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: stepId==='jira'?'#EEF2FF':stepId==='slack'?'#FFFFFF':'#F8FAFC',
                  border: `1px solid ${stepId==='jira'?'#C7D2FE':stepId==='slack'?'#E2E8F0':'#E2E8F0'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
                }}>
                  <ServiceBrandIcon type={stepId} size={24} />
                </div>
              )}
              {stepId === 'llm' && (
                <div style={{
                  width:44,height:44,borderRadius:12,flexShrink:0,
                  background:'linear-gradient(135deg,#FFF1EE,#FDF4EE)',
                  border:'1px solid #E4E9F2',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:3,
                  boxShadow:'0 2px 6px rgba(15,23,42,0.04)',
                }}>
                  <GroqIcon size={18}/>
                  <ClaudeLogo size={18} theme="light" iconOnly />
                </div>
              )}
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",
                  color:'#0F172A',letterSpacing:'-0.02em',marginBottom:3}}>
                  {STEPS[step].title}
                </div>
                <div style={{fontSize:13,color:'#64748B'}}>{STEPS[step].sub}</div>
              </div>
            </div>

            {/* Body: two-column for steps with guides */}
            <div style={{display:'flex',minHeight:340}}>
              {/* Left: form */}
              <div style={{flex:'0 0 52%',borderRight:GUIDES[stepId]?'1px solid #F1F5F9':'none'}}>
                {formContent[stepId]}
              </div>

              {/* Right: how-to guide */}
              {GUIDES[stepId] && (
                <div style={{flex:1,background:'#FAFBFC'}}>
                  <GuidePanel guide={GUIDES[stepId]}/>
                </div>
              )}
            </div>

            {/* Card footer: nav buttons */}
            <div style={{padding:'16px 32px',borderTop:'1px solid #F1F5F9',
              display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,
              background:'#FAFBFC'}}>
              {step>0&&(
                <button onClick={()=>setStep(s=>s-1)} style={{
                  padding:'9px 18px',background:'white',border:'1px solid #E4E9F2',borderRadius:8,
                  fontSize:13,fontWeight:600,fontFamily:"'Inter',sans-serif",
                  color:'#475569',cursor:'pointer',
                }}>Back</button>
              )}
              {canSkip&&!isLast&&(
                <button onClick={()=>setStep(s=>s+1)} style={{
                  padding:'9px 18px',background:'transparent',border:'1px solid #E4E9F2',
                  borderRadius:8,fontSize:13,fontWeight:600,fontFamily:"'Inter',sans-serif",
                  color:'#94A3B8',cursor:'pointer',
                }}>Skip</button>
              )}
              {!isLast?(
                <motion.button whileTap={{scale:0.97}} onClick={()=>setStep(s=>s+1)}
                  style={{
                    display:'flex',alignItems:'center',gap:6,padding:'9px 22px',
                    background:'#4F46E5',border:'none',borderRadius:8,
                    fontSize:13,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",
                    color:'white',cursor:'pointer',
                    boxShadow:'0 4px 14px rgba(79,70,229,0.25),inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}>
                  {step===0?'Get Started':'Continue'}
                  <span className="mso sm">arrow_forward</span>
                </motion.button>
              ):(
                <motion.button whileTap={{scale:0.97}} onClick={finish} disabled={saving}
                  style={{
                    display:'flex',alignItems:'center',gap:6,padding:'9px 22px',
                    background:saving?'#6EE7B7':'#059669',border:'none',borderRadius:8,
                    fontSize:13,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",
                    color:'white',cursor:saving?'not-allowed':'pointer',
                    boxShadow:'0 4px 14px rgba(5,150,105,0.25)',
                  }}>
                  {saving
                    ?<><span className="mso sm animate-spin">progress_activity</span>Saving…</>
                    :<><span className="mso sm">check</span>Launch Dashboard</>
                  }
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}