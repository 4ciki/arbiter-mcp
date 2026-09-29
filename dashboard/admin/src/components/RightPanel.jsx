import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import ArbiterLogo from './ArbiterLogo';

function ts(d) {
  if (!d) return '—';
  const s = Math.floor((Date.now()-(d.toDate?.()??d))/1000);
  if (s<10) return 'just now';
  if (s<60) return `${s}s ago`;
  if (s<3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

function Stat({val,label,color}) {
  return (
    <div style={{background:'white',border:'1px solid #E4E9F2',borderRadius:10,padding:'10px 12px',
      boxShadow:'0 1px 3px rgba(15,23,42,0.04)'}}>
      <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:22,fontWeight:800,color:'#0F172A'}}>{val}</div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',
        color:'#94A3B8',fontFamily:"'Plus Jakarta Sans',sans-serif",marginTop:2}}>{label}</div>
      <div style={{marginTop:4,height:2,borderRadius:1,background:`${color}22`}}>
        <div style={{height:'100%',borderRadius:1,background:color,width:`${Math.max(10,val*10)}%`,maxWidth:'100%'}}/>
      </div>
    </div>
  );
}

export default function RightPanel({ logs }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const q = query(collection(db,'sessions'),orderBy('lastActive','desc'),limit(20));
    return onSnapshot(q,snap=>setUsers(snap.docs.map(d=>d.data())),()=>{});
  },[]);

  const today = users.filter(u=>{const d=u.lastActive?.toDate?.();return d&&(Date.now()-d)<86400000;}).length;
  const week  = users.filter(u=>{const d=u.lastActive?.toDate?.();return d&&(Date.now()-d)<604800000;}).length;

  return (
    <aside style={{width:280,flexShrink:0,background:'#FAFBFC',borderLeft:'1px solid #E4E9F2',
      display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{flex:1,overflowY:'auto',padding:16}}>

        {/* Arbiter brand */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,
          padding:'12px 14px',background:'white',border:'1px solid #E4E9F2',borderRadius:12,
          boxShadow:'0 1px 3px rgba(15,23,42,0.04)'}}>
          <ArbiterLogo size={28} animate/>
          <div>
            <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:700,color:'#0F172A'}}>Arbiter MCP</div>
            <div style={{fontSize:10,color:'#94A3B8'}}>AI Agent · Active</div>
          </div>
          <div style={{marginLeft:'auto',width:8,height:8,borderRadius:'50%',background:'#059669',
            boxShadow:'0 0 6px #059669',animation:'pulse-ring 2.5s ease-in-out infinite'}}/>
        </div>

        {/* Users */}
        <div style={{marginBottom:18}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
              color:'#94A3B8',fontFamily:"'Plus Jakarta Sans',sans-serif",display:'flex',alignItems:'center',gap:6}}>
              <span className="mso sm" style={{fontSize:13}}>group</span> Active Users
            </div>
            <span style={{padding:'2px 8px',background:'#EEF2FF',border:'1px solid #C7D2FE',
              borderRadius:999,fontSize:10,fontWeight:700,color:'#4F46E5',
              fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
              {users.length}
            </span>
          </div>
          {users.length===0&&<div style={{fontSize:12,color:'#94A3B8',padding:'8px 0'}}>No sessions yet.</div>}
          {users.slice(0,4).map((u,i)=>{
            const init=(u.displayName||u.email||'?').slice(0,2).toUpperCase();
            return (
              <motion.div key={u.uid||i}
                initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
                style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                  background:'white',border:'1px solid #E4E9F2',borderRadius:9,marginBottom:6,
                  boxShadow:'0 1px 2px rgba(15,23,42,0.04)'}}>
                {u.photoURL
                  ?<img src={u.photoURL} alt="" style={{width:26,height:26,borderRadius:'50%',
                      border:'2px solid white',boxShadow:'0 0 0 1px #E4E9F2',flexShrink:0}}/>
                  :<div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,
                      background:'linear-gradient(135deg,#4F46E5,#818CF8)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:10,fontWeight:700,color:'white'}}>
                      {init}
                    </div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#0F172A',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.displayName||'Unknown'}</div>
                  <div style={{fontSize:10,color:'#94A3B8'}}>{ts(u.lastActive)}</div>
                </div>
                <div style={{width:7,height:7,borderRadius:'50%',background:'#059669',
                  boxShadow:'0 0 4px #059669',flexShrink:0}}/>
              </motion.div>
            );
          })}
        </div>

        {/* Stats */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
            color:'#94A3B8',fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:10,
            display:'flex',alignItems:'center',gap:6}}>
            <span className="mso sm" style={{fontSize:13}}>bar_chart</span> Analytics
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
            <Stat val={users.length} label="Total"  color="#4F46E5"/>
            <Stat val={today}        label="Today"  color="#059669"/>
            <Stat val={week}         label="Week"   color="#D97706"/>
          </div>
        </div>

        {/* Activity feed */}
        <div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
            color:'#94A3B8',fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:10,
            display:'flex',alignItems:'center',gap:6}}>
            <span className="mso sm" style={{fontSize:13}}>activity_zone</span> Activity
          </div>
          <div style={{background:'white',border:'1px solid #E4E9F2',borderRadius:10,overflow:'hidden',
            boxShadow:'0 1px 3px rgba(15,23,42,0.04)'}}>
            {logs.length===0&&<div style={{padding:'10px 12px',fontSize:11,color:'#94A3B8'}}>Waiting…</div>}
            {logs.slice(0,7).map((e,i)=>{
              const dot={success:'#059669',error:'#DC2626',warn:'#D97706',info:'#4F46E5'}[e.level]||'#4F46E5';
              return (
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:7,padding:'7px 12px',
                  borderBottom:'1px solid #F8FAFC'}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:dot,flexShrink:0,marginTop:5}}/>
                  <div>
                    <span style={{fontSize:10,color:'#CBD5E1',fontFamily:"'JetBrains Mono',monospace",marginRight:6}}>{e.time}</span>
                    <span style={{fontSize:11,color:'#475569'}}>{e.msg}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}