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

// REALITY CHECK (tested from screenshots):
// chatgpt    -> ?q= pre-fills, user must press Enter
// gemini     -> ?q= does NOT pre-fill; clipboard needed
// claude     -> /new?q= pre-fills, user must press Enter/send
// grok       -> ?text= pre-fills, user must send
// perplexity -> /search?q= AUTO-EXECUTES (search engine)
// copilot    -> ?q= does NOT pre-fill; clipboard needed
const LLMS = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    color: "#10A37F",
    glow: "rgba(16,163,127,0.28)",
    logo: null,           // inline SVG
    url: (q) => `https://chatgpt.com/?q=${q}`,
    status: "prefills",   // prompt pre-fills, user hits Enter
    hint: "Prompt pre-filled — press Enter",
  },
  {
    id: "gemini",
    name: "Gemini",
    color: "#4285F4",
    glow: "rgba(66,133,244,0.28)",
    logo: "/ai-logos/gemini.png",
    url: (q) => `https://gemini.google.com/app`,   // no working param; clipboard instead
    status: "clipboard",
    hint: "Prompt copied — paste & press Enter",
  },
  {
    id: "claude",
    name: "Claude",
    color: "#D97757",
    glow: "rgba(217,119,87,0.28)",
    logo: "/ai-logos/claude.svg",
    url: (q) => `https://claude.ai/new?q=${q}`,
    status: "prefills",
    hint: "Prompt pre-filled — click Send",
  },
  {
    id: "grok",
    name: "Grok",
    color: "#BBBBBB",
    glow: "rgba(200,200,200,0.2)",
    logo: "/ai-logos/grok.webp",
    url: (q) => `https://x.com/i/grok?text=${q}`,
    status: "prefills",
    hint: "Prompt pre-filled — press Enter",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    color: "#20808D",
    glow: "rgba(32,128,141,0.28)",
    logo: "/ai-logos/perplexity.avif",
    url: (q) => `https://www.perplexity.ai/search?q=${q}`,
    status: "auto",       // auto-executes!
    hint: "Opens & answers automatically",
  },
  {
    id: "copilot",
    name: "Copilot",
    color: "#7B2FBE",
    glow: "rgba(123,47,190,0.28)",
    logo: "/ai-logos/copilot.webp",
    url: (q) => `https://copilot.microsoft.com/`,  // no working param; clipboard instead
    status: "clipboard",
    hint: "Prompt copied — paste & press Enter",
  },
];

// Inline ChatGPT SVG (the official mark)
function ChatGPTMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 41 41" fill="none">
      <path fill="#10A37F" d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.214-2.421 10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.214 2.421 10.079 10.079 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.814Zm-15.576 21.905a7.461 7.461 0 0 1-4.801-1.728c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.487 7.386ZM6.392 33.801a7.463 7.463 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103L16.552 37.1A7.504 7.504 0 0 1 6.392 33.8ZM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.012L7.044 23.86A7.504 7.504 0 0 1 4.297 13.62Zm27.658 6.437-9.724-5.615 3.367-1.943a.121.121 0 0 1 .114-.012l8.048 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.647-1.13Zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.133-4.698a7.498 7.498 0 0 1 11.051 7.816Zm-21.063 6.929-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225Zm1.829-3.943 4.33-2.501 4.332 2.5v4.999l-4.331 2.5-4.331-2.5V18Z"/>
    </svg>
  );
}

function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    Object.assign(ta.style, { position: "fixed", opacity: 0 });
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } catch (_) {}
  return Promise.resolve();
}

// Status badge colours
const STATUS_STYLE = {
  auto:      { bg: "rgba(26,188,156,0.12)", color: "#1ABC9C", label: "⚡ Auto-runs" },
  prefills:  { bg: "rgba(243,156,18,0.1)",  color: "#F39C12", label: "✎ Pre-fills"  },
  clipboard: { bg: "rgba(100,116,139,0.1)", color: "#64748B", label: "⎘ Clipboard"  },
};

export default function AskAISection() {
  const [hovered, setHovered] = useState(null);
  const [toast, setToast]     = useState(null);

  function handleClick(e, llm) {
    e.preventDefault();
    const q   = encodeURIComponent(PROMPT);
    const url = llm.url(q);

    // Always copy to clipboard — useful for all cases
    copyToClipboard(PROMPT).then(() => {
      if (llm.status === "auto") {
        setToast({ text: `Opening Perplexity — executing automatically`, color: llm.color, icon: "⚡" });
      } else if (llm.status === "prefills") {
        setToast({ text: `${llm.hint} — also copied to clipboard`, color: llm.color, icon: "✓" });
      } else {
        setToast({ text: `Prompt copied! Paste into ${llm.name} (Ctrl+V) → Enter`, color: llm.color, icon: "⎘" });
      }
      setTimeout(() => setToast(null), 4500);
    });

    setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 180);
  }

  return (
    <section style={{
      padding: "90px 40px",
      borderTop: "1px solid rgba(26,188,156,0.07)",
      position: "relative", overflow: "hidden",
      background: "linear-gradient(180deg,transparent,rgba(26,188,156,0.025) 50%,transparent)",
    }}>
      {/* grid */}
      <div style={{
        position:"absolute",inset:0,pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(26,188,156,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(26,188,156,0.03) 1px,transparent 1px)",
        backgroundSize:"56px 56px",
        maskImage:"radial-gradient(ellipse 70% 55% at 50% 50%,black,transparent)",
        WebkitMaskImage:"radial-gradient(ellipse 70% 55% at 50% 50%,black,transparent)",
      }}/>
      <div style={{ position:"absolute",width:600,height:320,top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"radial-gradient(ellipse,rgba(26,188,156,0.04) 0%,transparent 70%)",filter:"blur(50px)",pointerEvents:"none" }}/>

      <div style={{ maxWidth:800,margin:"0 auto",position:"relative",zIndex:2 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity:0,y:28 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          transition={{ duration:0.6,ease:[0.22,1,0.36,1] }}
          style={{ textAlign:"center",marginBottom:48 }}
        >
          <div style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:99,background:"rgba(26,188,156,0.07)",border:"1px solid rgba(26,188,156,0.15)",marginBottom:18 }}>
            <span style={{ width:5,height:5,borderRadius:"50%",background:T,display:"inline-block",boxShadow:`0 0 5px ${T}` }}/>
            <span style={{ fontSize:11,fontWeight:700,color:T,letterSpacing:"0.09em",fontFamily:"'Plus Jakarta Sans',sans-serif",textTransform:"uppercase" }}>
              Third-party perspective
            </span>
          </div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"clamp(24px,3.2vw,38px)",fontWeight:800,letterSpacing:"-0.03em",color:"#F0FDF9",marginBottom:12,lineHeight:1.2 }}>
            Don&apos;t take our word for it
          </h2>
          <p style={{ fontSize:15,color:"#475569",maxWidth:440,margin:"0 auto",lineHeight:1.75 }}>
            Ask your preferred AI what it knows about Arbiter —
            independently, in its own words.
          </p>
        </motion.div>

        {/* LLM cards */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,maxWidth:720,margin:"0 auto" }}>
          {LLMS.map((llm, i) => {
            const isHov = hovered === llm.id;
            const st    = STATUS_STYLE[llm.status];
            return (
              <motion.a
                key={llm.id}
                href={llm.url(encodeURIComponent(PROMPT))}
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
                  display:"flex",flexDirection:"column",alignItems:"center",gap:9,
                  padding:"22px 8px 16px",borderRadius:18,textDecoration:"none",
                  background: isHov ? `linear-gradient(150deg,${llm.color}14,${llm.color}05)` : "rgba(8,14,24,0.75)",
                  border: isHov ? `1px solid ${llm.color}45` : "1px solid rgba(255,255,255,0.05)",
                  boxShadow: isHov ? `0 12px 40px ${llm.glow},inset 0 1px 0 rgba(255,255,255,0.04)` : "none",
                  transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  cursor:"pointer",position:"relative",overflow:"hidden",
                  backdropFilter:"blur(10px)",
                }}
              >
                {isHov && (
                  <motion.div
                    initial={{ scale:0.7,opacity:0.5 }} animate={{ scale:2.1,opacity:0 }}
                    transition={{ duration:1.0,repeat:Infinity }}
                    style={{ position:"absolute",width:42,height:42,borderRadius:"50%",border:`1px solid ${llm.color}`,top:18,pointerEvents:"none" }}
                  />
                )}

                {/* logo */}
                <div style={{
                  width:48,height:48,borderRadius:12,overflow:"hidden",
                  background: isHov ? `${llm.color}14` : "rgba(255,255,255,0.04)",
                  border:`1px solid ${isHov ? llm.color+"30":"rgba(255,255,255,0.05)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"all 0.25s",position:"relative",zIndex:1,
                }}>
                  {llm.logo ? (
                    <img src={llm.logo} alt={llm.name}
                      style={{ width:30,height:30,objectFit:"contain",display:"block",
                        filter: llm.id === "grok" ? "brightness(1.8)" : "none" }}
                    />
                  ) : (
                    <ChatGPTMark size={26}/>
                  )}
                </div>

                {/* name */}
                <div style={{
                  fontSize:11.5,fontWeight:700,
                  color: isHov ? "#F0FDF9" : "#475569",
                  fontFamily:"'Plus Jakarta Sans',sans-serif",
                  letterSpacing:"-0.01em",transition:"color 0.2s",
                  position:"relative",zIndex:1,
                }}>
                  {llm.name}
                </div>

                {/* status badge — always visible */}
                <div style={{
                  fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:99,
                  background: st.bg,color: st.color,
                  fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:"0.04em",
                  position:"relative",zIndex:1,
                }}>
                  {st.label}
                </div>

                {/* hover hint */}
                <AnimatePresence>
                  {isHov && (
                    <motion.div initial={{ opacity:0,y:3 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:3 }}
                      transition={{ duration:0.15 }}
                      style={{
                        position:"absolute",bottom:-1,left:0,right:0,
                        background:`linear-gradient(0deg,${llm.color}22,transparent)`,
                        borderRadius:"0 0 18px 18px",padding:"8px 6px 6px",
                        textAlign:"center",fontSize:9,color:llm.color,
                        fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",
                        letterSpacing:"0.02em",
                      }}
                    >
                      {llm.hint}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.a>
            );
          })}
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ delay:0.5 }}
          style={{ display:"flex",justifyContent:"center",gap:20,marginTop:28,flexWrap:"wrap" }}
        >
          {Object.entries(STATUS_STYLE).map(([key,s]) => (
            <div key={key} style={{ display:"flex",alignItems:"center",gap:5 }}>
              <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:s.bg,color:s.color,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                {s.label}
              </span>
              <span style={{ fontSize:11,color:"#334155" }}>
                {key === "auto" ? "— runs immediately" : key === "prefills" ? "— prompt in box, press Enter" : "— copied, paste & press Enter"}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0,y:14,scale:0.96 }}
            animate={{ opacity:1,y:0,scale:1 }}
            exit={{ opacity:0,y:8,scale:0.96 }}
            transition={{ duration:0.2 }}
            style={{
              position:"fixed",bottom:26,left:"50%",transform:"translateX(-50%)",
              zIndex:9999,pointerEvents:"none",
              background:"rgba(6,12,22,0.97)",backdropFilter:"blur(20px)",
              border:`1px solid ${toast.color}40`,borderRadius:12,
              padding:"10px 18px",
              boxShadow:`0 6px 30px ${toast.color}30`,
              display:"flex",alignItems:"center",gap:9,maxWidth:520,
            }}
          >
            <span style={{ fontSize:15,flexShrink:0 }}>{toast.icon}</span>
            <span style={{ fontSize:12.5,fontWeight:600,color:"#F0FDF9",fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"nowrap" }}>
              {toast.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
