import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { ServiceBrandIcon } from '../components/BrandLogos';

const DEFS = [
  { id:'jira',     name:'Jira Service Management', type:'jira'     },
  { id:'slack',    name:'Slack Workspace',          type:'slack'    },
  { id:'groq',     name:'Groq AI · Llama-3',       type:'groq'     },
  { id:'render',   name:'Render Infrastructure',    type:'render'   },
  { id:'database', name:'SQLite / Postgres DB',     type:'database' },
];

const ST = {
  ok:   {bg:'#ECFDF5',border:'#A7F3D0',color:'#065F46',icon:'check_circle',  strip:'#059669',label:'Verified'       },
  warn: {bg:'#FFFBEB',border:'#FDE68A',color:'#92400E',icon:'warning',        strip:'#D97706',label:'Not Configured' },
  error:{bg:'#FEF2F2',border:'#FECACA',color:'#991B1B',icon:'cancel',         strip:'#DC2626',label:'Error'          },
  idle: {bg:'#F8FAFC',border:'#E4E9F2',color:'#94A3B8',icon:'radio_button_unchecked',strip:'#E4E9F2',label:'Not Tested'},
};

function timeSince(d) {
  if (!d) return null;
  const s=Math.floor((Date.now()-d)/1000);
  if(s<10)return 'just now';if(s<60)return`${s}s ago`;if(s<3600)return`${Math.floor(s/60)}m ago`;
  return`${Math.floor(s/3600)}h ago`;
}

function buildPayload(def, cfg) {
  if (!cfg) return null;
  if (def.type==='jira')     return {type:'jira',    site_url:cfg.jira?.site_url,  email:cfg.jira?.email,      api_token:cfg.jira?.api_token};
  if (def.type==='slack')    return {type:'slack',   bot_token:cfg.slack?.bot_token};
  if (def.type==='groq')     return {type:'groq',    api_key:cfg.groq?.api_key};
  if (def.type==='render')   return {type:'render',  deploy_url:cfg.deploy?.deploy_url};
  if (def.type==='database') return {type:'database',database_url:cfg.database?.database_url};
  return null;
}

function isCfg(def,cfg) {
  if(!cfg)return false;
  if(def.type==='jira')     return !!(cfg.jira?.site_url&&cfg.jira?.email&&cfg.jira?.api_token);
  if(def.type==='slack')    return !!(cfg.slack?.bot_token);
  if(def.type==='groq')     return !!(cfg.groq?.api_key);
  if(def.type==='render')   return !!(cfg.deploy?.deploy_url);
  if(def.type==='database') return !!(cfg.database?.database_url);
  return false;
}

export default function CredentialsPage({ user, onLog, onNavigate }) {
  const [config,  setConfig]  = useState(null);
  const [states,  setStates]  = useState({});
  const [testing, setTesting] = useState({});

  useEffect(() => {
    if (!user?.uid) return;
    return onSnapshot(doc(db,'users',user.uid,'config','credentials'),
      snap => { if(snap.exists()) setConfig(snap.data()); }, ()=>{});
  }, [user?.uid]);

  useEffect(() => {
    if (!config) return;
    DEFS.forEach((def,i) => {
      if (isCfg(def,config)) setTimeout(()=>runTest(def,config),i*450+200);
      else setStates(s=>({...s,[def.id]:{status:'warn',msg:'Not configured — run Setup Wizard',latency:null,tested:null}}));
    });
  }, [config]);

  const API_BASE = (config?.deploy?.deploy_url||'https://arbiter-mcp.onrender.com').replace(/\/$/,'');

  async function runTest(def,cfg) {
    const payload=buildPayload(def,cfg||config);
    if(!payload)return;
    setTesting(t=>({...t,[def.id]:true}));
    const t0=Date.now();
    let result;
    try {
      const r=await fetch(`${API_BASE}/api/test-credential`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
      });
      result=await r.json();
    } catch { result={ok:false,message:'Cannot reach the Arbiter backend'}; }
    const st={status:result.ok?'ok':'error',msg:result.message||'',latency:result.ok?(Date.now()-t0):null,tested:Date.now()};
    setStates(s=>({...s,[def.id]:st}));
    setTesting(t=>{const n={...t};delete n[def.id];return n;});
    onLog?.(`${def.name}: ${st.msg||(result.ok?'OK':'Failed')}`, result.ok?'success':'error');
    toast[result.ok?'success':'error'](result.ok?`${def.name} — connected`:`${def.name}: ${st.msg?.slice(0,55)}`,{duration:3000});
  }

  function testAll() {
    DEFS.forEach((def,i)=>{if(isCfg(def,config))setTimeout(()=>runTest(def,config),i*550);});
  }

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <div>
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:18,fontWeight:800,
            color:'#0F172A',letterSpacing:'-0.02em'}}>Integration Status</div>
          <div style={{fontSize:13,color:'#64748B',marginTop:2}}>Live verification of all connected services</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <motion.button whileTap={{scale:0.97}} onClick={()=>onNavigate?.('setup')}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',
              background:'white',border:'1px solid #E4E9F2',borderRadius:8,
              fontSize:12,fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",
              color:'#475569',cursor:'pointer',boxShadow:'0 1px 3px rgba(15,23,42,0.06)'}}>
            <span className="mso sm">tune</span>Reconfigure
          </motion.button>
          <motion.button whileTap={{scale:0.97}} onClick={testAll}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',
              background:'#4F46E5',border:'none',borderRadius:8,
              fontSize:12,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",
              color:'white',cursor:'pointer',
              boxShadow:'0 4px 12px rgba(79,70,229,0.25),inset 0 1px 0 rgba(255,255,255,0.15)'}}>
            <span className="mso sm">wifi_tethering</span>Test All
          </motion.button>
        </div>
      </div>

      {/* No config banner */}
      {!config&&(
        <div style={{padding:'14px 18px',background:'#FFFBEB',border:'1px solid #FDE68A',
          borderRadius:10,marginBottom:20,display:'flex',alignItems:'center',gap:10,
          boxShadow:'0 1px 3px rgba(15,23,42,0.04)'}}>
          <span className="mso" style={{fontSize:22,color:'#D97706'}}>warning</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#92400E',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              No configuration found
            </div>
            <div style={{fontSize:12,color:'#78350F',marginTop:2}}>
              <span style={{color:'#4F46E5',cursor:'pointer',fontWeight:600}}
                onClick={()=>onNavigate?.('setup')}>Run the Setup Wizard</span>
              {' '}to connect your services.
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {DEFS.map((def,idx)=>{
          const st=states[def.id];
          const busy=!!testing[def.id];
          const stat=st?.status||(isCfg(def,config)?'idle':'warn');
          const s=ST[stat];
          const configured=isCfg(def,config);

          return (
            <motion.div key={def.id}
              initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
              transition={{delay:idx*0.07,duration:0.35}}
              style={{
                background:'white',borderRadius:12,border:'1px solid #E4E9F2',
                boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
                overflow:'hidden',position:'relative',
              }}>
              {/* Top status strip */}
              <div style={{height:3,background:s.strip,
                boxShadow:stat!=='idle'?`0 0 8px ${s.strip}44`:'none'}}/>

              {/* Loading overlay */}
              <AnimatePresence>
                {busy&&(
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    style={{position:'absolute',inset:0,background:'rgba(255,255,255,0.9)',
                      backdropFilter:'blur(4px)',display:'flex',flexDirection:'column',
                      alignItems:'center',justifyContent:'center',gap:8,zIndex:4,borderRadius:12}}>
                    <span className="mso animate-spin" style={{fontSize:28,color:'#4F46E5'}}>progress_activity</span>
                    <span style={{fontSize:12,fontWeight:700,color:'#4F46E5',
                      fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase'}}>
                      Probing…
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{padding:'16px 18px'}}>
                {/* Header */}
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                  <div style={{width:38,height:38,flexShrink:0,
                    background:def.type==='slack'?'#FFFFFF':stat==='ok'?'#ECFDF5':stat==='error'?'#FEF2F2':stat==='warn'?'#FFFBEB':'#F8FAFC',
                    border:`1px solid ${s.border}`,borderRadius:10,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    boxShadow:'0 1px 4px rgba(15,23,42,0.04)'}}>
                    <ServiceBrandIcon type={def.type} size={22} />
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#0F172A',
                      fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{def.name}</div>
                    <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>
                      {st?.tested?`Tested ${timeSince(st.tested)}`:configured?'Configured':'Not configured'}
                    </div>
                  </div>
                </div>

                {/* Badge */}
                <div style={{marginBottom:10}}>
                  <span style={{display:'inline-flex',alignItems:'center',gap:4,
                    padding:'3px 10px 3px 7px',borderRadius:999,
                    fontSize:11,fontWeight:700,letterSpacing:'0.04em',
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                    background:s.bg,border:`1px solid ${s.border}`,color:s.color}}>
                    <span className="mso fill sm" style={{fontSize:12}}>{s.icon}</span>
                    {s.label}
                  </span>

                  {st?.msg&&stat!=='ok'&&(
                    <div style={{marginTop:8,fontSize:12,lineHeight:1.5,color:s.color,
                      padding:'6px 10px',background:s.bg,border:`1px solid ${s.border}`,borderRadius:7}}>
                      {st.msg}
                    </div>
                  )}
                  {st?.msg&&stat==='ok'&&(
                    <div style={{marginTop:5,fontSize:12,color:'#059669',fontWeight:500}}>{st.msg}</div>
                  )}
                </div>

                {/* Footer */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  paddingTop:10,borderTop:'1px solid #F8FAFC'}}>
                  <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:'#94A3B8'}}>
                    {st?.latency?<span style={{color:'#4F46E5',fontWeight:600}}>{st.latency}ms</span>:null}
                  </div>
                  {configured?(
                    <motion.button whileTap={{scale:0.97}} onClick={()=>runTest(def,config)} disabled={busy}
                      style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',
                        background:'#F8FAFC',border:'1px solid #E4E9F2',borderRadius:7,
                        fontSize:11,fontWeight:700,color:'#475569',cursor:busy?'not-allowed':'pointer',
                        fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase',
                        opacity:busy?0.5:1,transition:'all 0.15s',}}
                      onMouseEnter={e=>{if(!busy){e.currentTarget.style.borderColor='#C7D2FE';e.currentTarget.style.color='#4F46E5';}}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='#E4E9F2';e.currentTarget.style.color='#475569';}}>
                      <span className="mso sm">wifi_tethering</span>
                      {stat==='ok'?'Re-test':stat==='error'?'Retry':'Test'}
                    </motion.button>
                  ):(
                    <motion.button whileTap={{scale:0.97}} onClick={()=>onNavigate?.('setup')}
                      style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',
                        background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:7,
                        fontSize:11,fontWeight:700,color:'#92400E',cursor:'pointer',
                        fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase'}}>
                      <span className="mso sm">settings</span>Configure
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}