import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArbiterLogo from './ArbiterLogo';

function StatusChip({ label, color }) {
  const colors = {
    green: { bg:'#ECFDF5', border:'#A7F3D0', text:'#065F46', dot:'#059669' },
    blue:  { bg:'#EFF6FF', border:'#BFDBFE', text:'#1E40AF', dot:'#3B82F6' },
    amber: { bg:'#FFFBEB', border:'#FDE68A', text:'#92400E', dot:'#D97706' },
  };
  const c = colors[color] || colors.green;
  return (
    <div style={{
      display:'flex',alignItems:'center',gap:5,padding:'4px 10px 4px 8px',
      background:c.bg,border:`1px solid ${c.border}`,borderRadius:999,
      fontSize:11,fontWeight:600,color:c.text,
      fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'0.01em',whiteSpace:'nowrap',
    }}>
      <div style={{width:6,height:6,borderRadius:'50%',background:c.dot,
        boxShadow:`0 0 4px ${c.dot}`,animation:'pulse-ring 2.5s ease-in-out infinite'}}/>
      {label}
    </div>
  );
}

export default function Header({ user, signOut }) {
  const [menuOpen, setMenu] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const fn = e => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <header style={{
      height:60,flexShrink:0,display:'flex',alignItems:'center',
      background:'white',borderBottom:'1px solid #E4E9F2',
      boxShadow:'0 1px 4px rgba(15,23,42,0.04)',
      padding:'0 20px',position:'relative',zIndex:100,
    }}>
      {/* Brand */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginRight:24}}>
        <ArbiterLogo size={30} animate="gyro" />
        <div>
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,fontWeight:800,
            color:'#0F172A',letterSpacing:'-0.02em',lineHeight:1}}>Arbiter</div>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',
            color:'#94A3B8',lineHeight:1,marginTop:2}}>MCP Console</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{width:1,height:28,background:'#F1F5F9',marginRight:20,flexShrink:0}}/>

      {/* Status chips */}
      <div style={{display:'flex',gap:6,flex:1}}>
        <StatusChip label="MCP Server: Online"  color="green"/>
        <StatusChip label="AI Engine: Active"   color="blue"/>
        <StatusChip label="Database: Connected" color="green"/>
      </div>

      {/* Right actions */}
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        {/* Refresh */}
        <button
          onClick={() => location.reload()}
          style={{
            width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',
            background:'#F8FAFC',border:'1px solid #E4E9F2',borderRadius:8,
            cursor:'pointer',color:'#94A3B8',transition:'all 0.15s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.background='#EEF2FF';e.currentTarget.style.borderColor='#C7D2FE';e.currentTarget.style.color='#4F46E5';}}
          onMouseLeave={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.borderColor='#E4E9F2';e.currentTarget.style.color='#94A3B8';}}
        >
          <span className="mso sm">refresh</span>
        </button>

        {/* User menu */}
        <div ref={menuRef} style={{position:'relative'}}>
          <button onClick={() => setMenu(o=>!o)} style={{
            display:'flex',alignItems:'center',gap:8,padding:'5px 12px 5px 6px',
            background:'#F8FAFC',border:'1px solid #E4E9F2',borderRadius:999,
            cursor:'pointer',transition:'all 0.15s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#C7D2FE';e.currentTarget.style.background='#EEF2FF';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#E4E9F2';e.currentTarget.style.background='#F8FAFC';}}>
            {user.photoURL
              ? <img src={user.photoURL} alt="" style={{width:26,height:26,borderRadius:'50%',
                  border:'2px solid white',boxShadow:'0 0 0 1px #E4E9F2'}}/>
              : <div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,#4F46E5,#818CF8)',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span className="mso fill" style={{fontSize:14,color:'white'}}>person</span>
                </div>
            }
            <span style={{fontSize:13,fontWeight:600,color:'#0F172A',fontFamily:"'Inter',sans-serif"}}>
              {user.displayName?.split(' ')[0] || user.email}
            </span>
            <span className="mso sm" style={{color:'#94A3B8'}}>expand_more</span>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{opacity:0,y:-8,scale:0.96}} animate={{opacity:1,y:0,scale:1}}
                exit={{opacity:0,y:-8,scale:0.96}} transition={{duration:0.15}}
                style={{
                  position:'absolute',top:'calc(100% + 8px)',right:0,
                  background:'white',border:'1px solid #E4E9F2',borderRadius:12,
                  padding:6,boxShadow:'0 16px 40px rgba(15,23,42,0.12)',minWidth:200,
                }}>
                <div style={{padding:'8px 12px',marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#0F172A'}}>{user.displayName}</div>
                  <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{user.email}</div>
                </div>
                <div style={{height:1,background:'#F1F5F9',marginBottom:4}}/>
                <button onClick={signOut} style={{
                  width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
                  background:'transparent',border:'none',borderRadius:8,cursor:'pointer',
                  fontSize:13,color:'#DC2626',fontFamily:"'Inter',sans-serif",textAlign:'left',
                  transition:'background 0.12s',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='#FEF2F2'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span className="mso sm" style={{color:'#DC2626'}}>logout</span>
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}