const C = { green:'#059669', blue:'#3B82F6', amber:'#D97706', red:'#DC2626', gray:'#CBD5E1' };
export default function Led({ color='green', size=7, pulse=true }) {
  const c = C[color] || color;
  return <div style={{width:size,height:size,borderRadius:'50%',flexShrink:0,
    background:c, boxShadow:`0 0 5px ${c}66`,
    animation: pulse ? 'pulse-ring 2.5s ease-in-out infinite' : 'none'}}/>;
}