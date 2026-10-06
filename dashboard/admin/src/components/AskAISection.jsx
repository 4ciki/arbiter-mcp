import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const T = "#1ABC9C";

const PROMPT =
  "Tell me about Arbiter MCP by 4ciki Solutions. " +
  "It is an open-source, AI-powered IT helpdesk automation agent that connects " +
  "Jira and Slack — it automatically classifies incoming support tickets by severity " +
  "(P0-P3), auto-resolves safe/routine issues, and escalates critical or risky " +
  "incidents to human engineers via Slack with zero false-positive auto-resolutions. " +
  "Built with LangGraph, FastAPI, MCP protocol, and ChromaDB. " +
  "GitHub: https://github.com/4ciki/arbiter-mcp  " +
  "Live demo: https://arbiter-mcp.onrender.com  " +
  "Please explain what it does, why it matters, and what makes it unique.";

const AUTO_EXECUTE = { chatgpt: true, perplexity: true, copilot: true };

function buildUrl(id) {
  const q = encodeURIComponent(PROMPT);
  switch (id) {
    case "chatgpt":    return `https://chatgpt.com/?q=${q}`;
    case "gemini":     return `https://gemini.google.com/app?q=${q}`;
    case "claude":     return `https://claude.ai/new?q=${q}`;
    case "grok":       return `https://x.com/i/grok?text=${q}`;
    case "perplexity": return `https://www.perplexity.ai/search?q=${q}`;
    case "copilot":    return `https://copilot.microsoft.com/?q=${q}`;
    default:           return "#";
  }
}

// Logo path → served from Vite public/ai-logos/
const LOGO = {
  chatgpt:    "/ai-logos/chatgpt.avif",
  gemini:     "/ai-logos/gemini.png",
  claude:     "/ai-logos/claude.svg",
  grok:       "/ai-logos/grok.webp",
  perplexity: null,   // use inline SVG
  copilot:    "/ai-logos/copilot.webp",
};

const LLMS = [
  { id:"chatgpt",    name:"ChatGPT",    color:"#10A37F", glow:"rgba(16,163,127,0.3)",   auto:true  },
  { id:"gemini",     name:"Gemini",     color:"#4285F4", glow:"rgba(66,133,244,0.3)",   auto:false },
  { id:"claude",     name:"Claude",     color:"#D97757", glow:"rgba(217,119,87,0.3)",   auto:false },
  { id:"grok",       name:"Grok",       color:"#AAAAAA", glow:"rgba(180,180,180,0.25)", auto:false },
  { id:"perplexity", name:"Perplexity", color:"#20808D", glow:"rgba(32,128,141,0.3)",   auto:true  },
  { id:"copilot",    name:"Copilot",    color:"#7B2FBE", glow:"rgba(123,47,190,0.3)",   auto:true  },
];

function PerplexityLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9.01 2v5.749L4.784 3.521 3.54 4.766 7.739 8.99H2v1.745h5.739v9.518h1.745V10.74h3.766v9.513h1.745V10.74H21V8.994h-5.74l4.2-4.225-1.244-1.244-4.228 4.226V2zm1.745 6.994v-.009l1.883-1.89 1.882 1.89v.009z" fill="#20808D"/>
    </svg>
  );
}

function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    Object.assign(ta.style, { position:"fixed", opacity:0 });
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } catch (_) {}
  return Promise.resolve();
}

export default function AskAISection() {
  const [hovered, setHovered] = useState(null);
  const [toast, setToast]     = useState(null);
  const activeLLM = LLMS.find(l => l.id === hovered);

  function handleClick(e, llm) {
    e.preventDefault();
    if (!llm.auto) {
      copyToClipboard(PROMPT).then(() => {
        setToast({ text: `Prompt copied — paste into ${llm.name} and press Enter`, color: llm.color });
        setTimeout(() => setToast(null), 4200);
      });
    } else {
      setToast({ text: `Sending to ${llm.name}…`, color: llm.color });
      setTimeout(() => setToast(null), 2800);
    }
    setTimeout(() => window.open(buildUrl(llm.id), "_blank", "noopener,noreferrer"), llm.auto ? 100 : 380);
  }

  return (
    <section style={{
      padding:"90px 40px",
      borderTop:"1px solid rgba(26,188,156,0.07)",
      position:"relative", overflow:"hidden",
      background:"linear-gradient(180deg,transparent,rgba(26,188,156,0.025) 50%,transparent)",
    }}>
      {/* subtle grid */}
      <div style={{
        position:"absolute",inset:0,pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(26,188,156,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(26,188,156,0.035) 1px,transparent 1px)",
        backgroundSize:"56px 56px",
        maskImage:"radial-gradient(ellipse 70% 55% at 50% 50%,black,transparent)",
        WebkitMaskImage:"radial-gradient(ellipse 70% 55% at 50% 50%,black,transparent)",
      }}/>
      {/* ambient */}
      <div style={{ position:"absolute",width:600,height:350,top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"radial-gradient(ellipse,rgba(26,188,156,0.05) 0%,transparent 70%)",filter:"blur(50px)",pointerEvents:"none" }}/>

      <div style={{ maxWidth:820,margin:"0 auto",position:"relative",zIndex:2 }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity:0,y:28 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          transition={{ duration:0.6,ease:[0.22,1,0.36,1] }}
          style={{ textAlign:"center",marginBottom:52 }}
        >
          <div style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:99,background:"rgba(26,188,156,0.07)",border:"1px solid rgba(26,188,156,0.16)",marginBottom:18 }}>
            <span style={{ width:5,height:5,borderRadius:"50%",background:T,display:"inline-block",boxShadow:`0 0 5px ${T}` }}/>
            <span style={{ fontSize:11,fontWeight:700,color:T,letterSpacing:"0.09em",fontFamily:"'Plus Jakarta Sans',sans-serif",textTransform:"uppercase" }}>
              Third-party perspective
            </span>
          </div>

          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"clamp(24px,3.2vw,38px)",fontWeight:800,letterSpacing:"-0.03em",color:"#F0FDF9",marginBottom:12,lineHeight:1.2 }}>
            Don&apos;t take our word for it
          </h2>
          <p style={{ fontSize:15,color:"#475569",maxWidth:460,margin:"0 auto",lineHeight:1.75 }}>
            Ask your preferred AI what it knows about Arbiter —
            independently, in its own words.
          </p>
        </motion.div>

        {/* ── LLM cards ── */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:14,maxWidth:720,margin:"0 auto" }}>
          {LLMS.map((llm, i) => {
            const isHov = hovered === llm.id;
            const logo  = LOGO[llm.id];
            return (
              <motion.a
                key={llm.id}
                href={buildUrl(llm.id)}
                target="_blank" rel="noreferrer noopener"
                initial={{ opacity:0,y:20 }}
                whileInView={{ opacity:1,y:0 }}
                viewport={{ once:true }}
                transition={{ duration:0.4,delay:0.06+i*0.07 }}
                whileHover={{ y:-8,scale:1.06 }}
                whileTap={{ scale:0.94 }}
                onHoverStart={() => setHovered(llm.id)}
                onHoverEnd={() => setHovered(null)}
                onClick={(e) => handleClick(e, llm)}
                style={{
                  display:"flex",flexDirection:"column",alignItems:"center",gap:10,
                  padding:"24px 10px 18px",borderRadius:18,textDecoration:"none",
                  background: isHov ? `linear-gradient(150deg,${llm.color}15,${llm.color}05)` : "rgba(8,15,26,0.7)",
                  border: isHov ? `1px solid ${llm.color}50` : "1px solid rgba(240,253,249,0.06)",
                  boxShadow: isHov ? `0 12px 40px ${llm.glow},inset 0 1px 0 rgba(255,255,255,0.04)` : "none",
                  transition:"all 0.26s cubic-bezier(0.34,1.56,0.64,1)",
                  cursor:"pointer",position:"relative",overflow:"hidden",
                  backdropFilter:"blur(10px)",
                }}
              >
                {/* pulse ring on hover */}
                {isHov && (
                  <motion.div
                    initial={{ scale:0.7,opacity:0.6 }} animate={{ scale:2,opacity:0 }}
                    transition={{ duration:1.1,repeat:Infinity }}
                    style={{ position:"absolute",width:44,height:44,borderRadius:"50%",border:`1.5px solid ${llm.color}`,top:20,pointerEvents:"none" }}
                  />
                )}

                {/* logo image */}
                <div style={{
                  width:48,height:48,borderRadius:12,
                  background: isHov ? `${llm.color}15` : "rgba(255,255,255,0.04)",
                  border:`1px solid ${isHov ? llm.color+"35":"rgba(255,255,255,0.05)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"all 0.26s",position:"relative",zIndex:1,overflow:"hidden",
                }}>
                  {logo ? (
                    <img
                      src={logo} alt={llm.name}
                      style={{ width:28,height:28,objectFit:"contain",display:"block" }}
                    />
                  ) : (
                    <PerplexityLogo size={26}/>
                  )}
                </div>

                {/* name */}
                <div style={{
                  fontSize:11.5,fontWeight:700,
                  color: isHov ? "#F0FDF9" : "#475569",
                  fontFamily:"'Plus Jakarta Sans',sans-serif",
                  letterSpacing:"-0.01em",
                  transition:"color 0.2s",position:"relative",zIndex:1,
                }}>
                  {llm.name}
                </div>

                {/* auto badge */}
                <AnimatePresence>
                  {isHov && (
                    <motion.div
                      initial={{ opacity:0,y:4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:4 }}
                      transition={{ duration:0.16 }}
                      style={{ fontSize:9.5,color:llm.color,fontWeight:700,display:"flex",alignItems:"center",gap:3,position:"relative",zIndex:1,letterSpacing:"0.03em" }}
                    >
                      {llm.auto ? "Auto-sends" : "Paste & send"}
                      <span className="mso" style={{ fontSize:11 }}>arrow_outward</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.a>
            );
          })}
        </div>

        {/* ── Caption ── */}
        <motion.p
          initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ delay:0.55 }}
          style={{ textAlign:"center",marginTop:28,fontSize:11.5,color:"#2D3B4E",lineHeight:1.6 }}
        >
          <span style={{ color:"#10A37F",fontWeight:600 }}>ChatGPT · Perplexity · Copilot</span> send the prompt automatically &nbsp;·&nbsp;
          <span style={{ color:"#475569" }}>Gemini · Claude · Grok</span> — prompt copies to clipboard, just paste and press Enter
        </motion.p>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0,y:16,scale:0.96 }}
            animate={{ opacity:1,y:0,scale:1 }}
            exit={{ opacity:0,y:8,scale:0.96 }}
            transition={{ duration:0.22 }}
            style={{
              position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",
              zIndex:9999,pointerEvents:"none",
              background:"rgba(8,15,26,0.96)",backdropFilter:"blur(18px)",
              border:`1px solid ${toast.color}44`,borderRadius:12,
              padding:"11px 20px",
              boxShadow:`0 6px 28px ${toast.color}33`,
              display:"flex",alignItems:"center",gap:9,
            }}
          >
            <span style={{ width:7,height:7,borderRadius:"50%",background:toast.color,flexShrink:0,boxShadow:`0 0 7px ${toast.color}` }}/>
            <span style={{ fontSize:12.5,fontWeight:600,color:"#F0FDF9",fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"nowrap" }}>
              {toast.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
