import Led from './Led';
export default function StatusPill({ label, color }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px 4px 8px',
      background:'white',border:'1px solid #E4E9F2',borderRadius:999,
      fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,fontWeight:600,
      boxShadow:'0 1px 2px rgba(15,23,42,0.04)',whiteSpace:'nowrap',color:'#475569'}}>
      <Led color={color} size={6}/>
      <span>{label}</span>
    </div>
  );
}