import { motion } from 'framer-motion';
import ArbiterLogo from '../components/ArbiterLogo';

export default function SettingsPage({ user, signOut, onSetup }) {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:18,fontWeight:800,color:'#0F172A',letterSpacing:'-0.02em'}}>Settings</div>
        <div style={{fontSize:13,color:'#64748B',marginTop:2}}>Account and system preferences</div>
      </div>
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} style={{
        background:'white',border:'1px solid #E4E9F2',borderRadius:14,padding:28,
        boxShadow:'0 2px 8px rgba(15,23,42,0.05)',maxWidth:520,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,paddingBottom:20,
          borderBottom:'1px solid #F1F5F9'}}>
          {user.photoURL
            ?<img src={user.photoURL} alt="" style={{width:56,height:56,borderRadius:'50%',
                border:'3px solid white',boxShadow:'0 0 0 2px #E4E9F2'}}/>
            :<div style={{width:56,height:56,borderRadius:'50%',
                background:'linear-gradient(135deg,#4F46E5,#818CF8)',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span className="mso fill" style={{fontSize:30,color:'white'}}>person</span>
              </div>
          }
          <div>
            <div style={{fontSize:18,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#0F172A'}}>{user.displayName||'Admin'}</div>
            <div style={{fontSize:13,color:'#64748B',marginTop:3}}>{user.email}</div>
            <span style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:7,padding:'3px 9px',
              background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:999,
              fontSize:11,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#065F46',letterSpacing:'0.04em'}}>
              <span className="mso fill sm" style={{fontSize:11,color:'#059669'}}>verified</span>
              Google Authenticated
            </span>
          </div>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <motion.button whileTap={{scale:0.97}} onClick={onSetup}
            style={{display:'flex',alignItems:'center',gap:7,padding:'10px 18px',
              background:'#EEF2FF',border:'1px solid #C7D2FE',borderRadius:9,
              color:'#4F46E5',fontSize:13,fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",cursor:'pointer',
              transition:'all 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#E0E7FF'}
            onMouseLeave={e=>e.currentTarget.style.background='#EEF2FF'}>
            <span className="mso sm">tune</span>Reconfigure Credentials
          </motion.button>
          <motion.button whileTap={{scale:0.97}} onClick={signOut}
            style={{display:'flex',alignItems:'center',gap:7,padding:'10px 18px',
              background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:9,
              color:'#DC2626',fontSize:13,fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",cursor:'pointer',
              transition:'all 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#FEE2E2'}
            onMouseLeave={e=>e.currentTarget.style.background='#FEF2F2'}>
            <span className="mso sm">logout</span>Sign Out
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}