import { useState, useRef, useEffect } from "react";
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
  "Please explain what it does, why it matters, and what makes it unique compared to other IT automation tools.";

function buildUrl(id) {
  const q = encodeURIComponent(PROMPT);
  const map = {
    chatgpt:    `https://chatgpt.com/?q=${q}`,
    gemini:     `https://gemini.google.com/app?q=${q}`,
    claude:     `https://claude.ai/new?q=${q}`,
    grok:       `https://x.com/i/grok?text=${q}`,
    perplexity: `https://www.perplexity.ai/?q=${q}`,
    copilot:    `https://copilot.microsoft.com/?q=${q}`,
  };
  return map[id] || "#";
}

const LLMS = [
  { id:"chatgpt",    name:"ChatGPT",    color:"#10A37F", glow:"rgba(16,163,127,0.35)",  tag:"by OpenAI"    },
  { id:"gemini",     name:"Gemini",     color:"#4285F4", glow:"rgba(66,133,244,0.35)",  tag:"by Google"    },
  { id:"claude",     name:"Claude",     color:"#D97757", glow:"rgba(217,119,87,0.35)",  tag:"by Anthropic" },
  { id:"grok",       name:"Grok",       color:"#A0A0A0", glow:"rgba(160,160,160,0.3)",  tag:"by xAI"       },
  { id:"perplexity", name:"Perplexity", color:"#20808D", glow:"rgba(32,128,141,0.35)", tag:"AI search"    },
  { id:"copilot",    name:"Copilot",    color:"#7B2FBE", glow:"rgba(123,47,190,0.35)", tag:"by Microsoft" },
];

function ChatGPTIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 41 41" fill="none">
      <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.214-2.421 10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.214 2.421 10.079 10.079 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.814Zm-15.576 21.905a7.461 7.461 0 0 1-4.801-1.728c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.487 7.386ZM6.392 33.801a7.463 7.463 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103L16.552 37.1A7.504 7.504 0 0 1 6.392 33.8ZM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.012L7.044 23.86A7.504 7.504 0 0 1 4.297 13.62Zm27.658 6.437-9.724-5.615 3.367-1.943a.121.121 0 0 1 .114-.012l8.048 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.647-1.13Zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.133-4.698a7.498 7.498 0 0 1 11.051 7.816Zm-21.063 6.929-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225Zm1.829-3.943 4.33-2.501 4.332 2.5v4.999l-4.331 2.5-4.331-2.5V18Z" fill="#10A37F"/>
    </svg>
  );
}

function GeminiIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <defs>
        <linearGradient id="gem-a" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#1AA1E4"/>
          <stop offset="100%" stopColor="#1A73E8"/>
        </linearGradient>
        <linearGradient id="gem-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A73E8"/>
          <stop offset="100%" stopColor="#1AA1E4"/>
        </linearGradient>
      </defs>
      <path d="M14 28C14 28 14 17.5 7 14C0 10.5 0 14 0 14C0 14 10.5 14 14 7C17.5 0 14 0 14 0C14 0 14 10.5 21 14C28 17.5 28 14 28 14C28 14 17.5 14 14 21C10.5 28 14 28 14 28Z" fill="url(#gem-a)"/>
    </svg>
  );
}

function ClaudeIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-1.385-.121L2 12.264l.194-.87.727-.388 1.587.097 2.339.17 2.214.097h.403l.048-.17-.048-.121-1.745-1.067-2.238-1.336-1.854-1.166-.936-.742-.29-.936.936-.936 1.021.097 1.312.863 2.02 1.457 1.842 1.336.888.68.145-.073.024-.17-.411-.606-1.312-2.11-1.106-1.927-.717-1.627-.29-1.336.146-.606.799-.461.969.17.678.437.912 1.739L9.947 7.9l.969 1.884.316.243.146-.049.073-.17V4.724l.097-1.776.194-1.288L12.401 1l.97-.024.775.461.17 1.312-.073 1.46-.194 3.197v1.12l.146.17h.17l.388-.437L16.296 6.1l1.697-1.724 1.312-1.215.872-.437.97.194.485.606-.049.921-.827 1.045L18.87 7.416l-1.892 1.96-.946 1.288.073.17.194.048.315-.17 1.336-.606 2.46-1.069 1.603-.436.921.17.34.969-.34.849-1.554.678-1.82.545-2.12.836-.485.17.049.146.17.097 1.118.024 1.748.097 1.604.17.897.34.388.995-.146.849-.921.315-1.506-.17-2.023-.364-1.312-.121h-.388l-.049.194.073.121 1.069 1.166 1.336 1.7.921 1.482.388 1.045-.049.7-.606.485-.92-.146-1.118-.921-1.579-2.001-1.021-1.554-.51-.558-.193.048-.098.194.025 1.578-.049 1.409-.073.849-.388.97-.849.267-.849-.388-.34-1.024.073-2.11.097-1.313-.024-.17-.17-.097-.17.073-.508.558-1.118 1.167-1.7 1.46-1.288.799-.97.219-.8-.316-.315-.895.243-.824 1.409-1.361 1.506-1.433.945-1.069.364-.558-.097-.146-.146-.024-.83.17-1.63.437-2.122.315-1.506.049-.824-.243-.606-.897-.073-.848.267-.267.9.049.9 1.676 2.46.823h.364l.073-.194-.073-.121-1.48-.97-1.36-1.167-.997-1.02-.51-.9L2 16.806l.097-.9 1.118-.485" fill="#D97757"/>
    </svg>
  );
}

function GrokIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.99 20.893L7.01 3.107A1.008 1.008 0 0 0 6.143 2.6H3.108a.504.504 0 0 0-.435.755l9.933 17.69a1.008 1.008 0 0 0 .874.507h3.082a.504.504 0 0 0 .428-.659z" fill="white"/>
      <path d="M3.667 20.986l7.381-7.713-2.102-3.461-8.38 10.38a.504.504 0 0 0 .393.808h2.29a.507.507 0 0 0 .418-.014z" fill="white" opacity="0.7"/>
      <path d="M20.948 2.567a.504.504 0 0 0-.41-.567h-2.29a.507.507 0 0 0-.42.217L11.056 12.1l2.128 3.411 7.764-12.944z" fill="white" opacity="0.5"/>
    </svg>
  );
}

function PerplexityIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9.01 2v5.749L4.784 3.521 3.54 4.766 7.739 8.99H2v1.745h5.739v9.518h1.745V10.74h3.766v9.513h1.745V10.74H21V8.994h-5.74l4.2-4.225-1.244-1.244-4.228 4.226V2zm1.745 6.994v-.009l1.883-1.89 1.882 1.89v.009z" fill="#20808D"/>
    </svg>
  );
}

function CopilotIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="cop-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B5CF6"/>
          <stop offset="100%" stopColor="#0078D4"/>
        </linearGradient>
      </defs>
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.236 2.636 7.855 6.356 9.312C8.26 21.396 8 21.196 8 20.5V18c0-.898.396-1.985 1.188-2.5C6.729 15.166 5 13.092 5 10.5 5 7.462 7.462 5 10.5 5c.343 0 .677.035 1 .1C12.168 3.779 13.01 3 14 3h2c.552 0 1 .448 1 1v1.535C18.753 6.791 20 8.506 20 10.5c0 2.592-1.729 4.666-4.188 5 .792.515 1.188 1.602 1.188 2.5v2.5c0 .696-.26.896-.356.812C20.364 19.855 22 16.236 22 12c0-5.52-4.48-10-10-10Z" fill="url(#cop-a)"/>
      <circle cx="12" cy="14" r="2.5" fill="white" opacity="0.9"/>
    </svg>
  );
}

const IconMap = { chatgpt: ChatGPTIcon, gemini: GeminiIcon, claude: ClaudeIcon, grok: GrokIcon, perplexity: PerplexityIcon, copilot: CopilotIcon };

const PROMPT_PREVIEW = "Tell me about Arbiter MCP by 4ciki Solutions — the open-source AI helpdesk agent that auto-triages Jira + Slack tickets by severity, resolves safe issues autonomously, and escalates risky ones to humans…";

function TypedText({ text, speed = 22 }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayed("");
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return <>{displayed}<span style={{ borderRight: "1.5px solid #1ABC9C", marginLeft: 1 }} /></>;
}

export default function AskAISection() {
  const [hovered, setHovered] = useState(null);
  const activeLLM = LLMS.find(l => l.id === hovered);

  return (
    <section style={{
      padding: "100px 40px",
      borderTop: "1px solid rgba(26,188,156,0.08)",
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(180deg,transparent,rgba(26,188,156,0.02) 40%,transparent)",
    }}>
      {/* grid bg */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(26,188,156,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,188,156,0.04) 1px,transparent 1px)",
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%,black,transparent)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 50%,black,transparent)",
      }}/>
      <div style={{
        position: "absolute", width: 700, height: 400, top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(ellipse,rgba(26,188,156,0.06) 0%,transparent 70%)",
        filter: "blur(60px)", pointerEvents: "none",
      }}/>

      <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 2 }}>
        {/* header */}
        <motion.div initial={{ opacity:0,y:30 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }} transition={{ duration:0.6,ease:[0.22,1,0.36,1] }}
          style={{ textAlign:"center", marginBottom:56 }}>
          <div style={{
            display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:99,
            background:"rgba(26,188,156,0.08)",border:"1px solid rgba(26,188,156,0.18)",marginBottom:20,
          }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:T,display:"inline-block",boxShadow:`0 0 6px ${T}` }}/>
            <span style={{ fontSize:12,fontWeight:700,color:T,letterSpacing:"0.08em",fontFamily:"'Plus Jakarta Sans',sans-serif",textTransform:"uppercase" }}>
              AI Perspectives
            </span>
          </div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"clamp(26px,3.5vw,42px)",fontWeight:900,letterSpacing:"-0.03em",color:"#F0FDF9",marginBottom:14,lineHeight:1.15 }}>
            Ask any AI about&nbsp;<span style={{ color:T }}>Arbiter</span>
          </h2>
          <p style={{ fontSize:16,color:"#64748B",maxWidth:520,margin:"0 auto",lineHeight:1.7 }}>
            Pick your AI assistant below — it'll open with a ready-made question about Arbiter MCP and{" "}
            <strong style={{ color:"#94A3B8" }}>4ciki Solutions</strong> already loaded.
          </p>
        </motion.div>

        {/* prompt card */}
        <motion.div
          initial={{ opacity:0,scale:0.96 }} whileInView={{ opacity:1,scale:1 }} viewport={{ once:true }} transition={{ duration:0.55,delay:0.15 }}
          style={{
            maxWidth: 600, margin: "0 auto 52px",
            background: "rgba(10,18,30,0.85)",
            border: `1px solid ${activeLLM ? activeLLM.color+"55" : "rgba(26,188,156,0.15)"}`,
            borderRadius: 16, padding: "22px 26px",
            boxShadow: activeLLM ? `0 0 50px ${activeLLM.glow}` : "none",
            transition: "border-color 0.3s,box-shadow 0.3s",
            backdropFilter: "blur(14px)",
          }}
        >
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
            <div style={{
              width:36,height:36,borderRadius:10,flexShrink:0,
              background: activeLLM ? activeLLM.color+"22" : "rgba(26,188,156,0.12)",
              border: `1px solid ${activeLLM ? activeLLM.color+"44":"rgba(26,188,156,0.2)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all 0.3s",
            }}>
              {activeLLM ? <span style={{ fontSize:18 }}>✦</span> : <span className="mso" style={{ fontSize:18,color:T }}>edit_note</span>}
            </div>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:"#CBD5E1",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                {activeLLM ? `Will open ${activeLLM.name} with this prompt` : "Your prompt — sent to whichever AI you choose"}
              </div>
              <div style={{ fontSize:11,color:"#475569" }}>{activeLLM ? activeLLM.tag : "Hover an assistant to preview"}</div>
            </div>
          </div>
          <div style={{
            fontSize:12.5,color:"#94A3B8",lineHeight:1.75,
            fontFamily:"ui-monospace,Menlo,monospace",
            borderLeft:"2px solid rgba(26,188,156,0.22)",paddingLeft:14,
          }}>
            <TypedText text={PROMPT_PREVIEW} speed={22}/>
          </div>
          <div style={{ marginTop:14,display:"flex",alignItems:"center",gap:6 }}>
            <span className="mso" style={{ fontSize:14,color:"#334155" }}>link</span>
            <span style={{ fontSize:11,color:"#334155" }}>github.com/4ciki/arbiter-mcp · arbiter-mcp.onrender.com</span>
          </div>
        </motion.div>

        {/* LLM grid */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(6,1fr)",
          gap:14,maxWidth:780,margin:"0 auto",
        }}>
          {LLMS.map((llm, i) => {
            const Icon = IconMap[llm.id];
            const isHov = hovered === llm.id;
            return (
              <motion.a
                key={llm.id}
                href={buildUrl(llm.id)}
                target="_blank"
                rel="noreferrer noopener"
                initial={{ opacity:0,y:24 }}
                whileInView={{ opacity:1,y:0 }}
                viewport={{ once:true }}
                transition={{ duration:0.45,delay:0.08+i*0.07 }}
                whileHover={{ y:-7,scale:1.05 }}
                whileTap={{ scale:0.95 }}
                onHoverStart={() => setHovered(llm.id)}
                onHoverEnd={() => setHovered(null)}
                style={{
                  display:"flex",flexDirection:"column",alignItems:"center",gap:9,
                  padding:"22px 10px 18px",borderRadius:16,textDecoration:"none",
                  background: isHov ? `linear-gradient(150deg,${llm.color}18,${llm.color}08)` : "rgba(10,18,30,0.7)",
                  border: isHov ? `1px solid ${llm.color}55` : "1px solid rgba(240,253,249,0.07)",
                  boxShadow: isHov ? `0 10px 36px ${llm.glow},inset 0 1px 0 rgba(255,255,255,0.04)` : "none",
                  transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  cursor:"pointer",position:"relative",overflow:"hidden",
                  backdropFilter:"blur(8px)",
                }}
              >
                {isHov && (
                  <motion.div initial={{ scale:0.8,opacity:0.7 }} animate={{ scale:1.8,opacity:0 }} transition={{ duration:1.2,repeat:Infinity }}
                    style={{ position:"absolute",width:46,height:46,borderRadius:"50%",border:`1.5px solid ${llm.color}`,top:18,pointerEvents:"none" }}
                  />
                )}
                <div style={{
                  width:48,height:48,borderRadius:12,
                  background: isHov ? `${llm.color}18` : "rgba(255,255,255,0.04)",
                  border:`1px solid ${isHov ? llm.color+"40":"rgba(255,255,255,0.06)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"all 0.25s",position:"relative",zIndex:1,
                }}>
                  <Icon size={26}/>
                </div>
                <div style={{
                  fontSize:12,fontWeight:700,color: isHov ? "#F0FDF9" : "#64748B",
                  fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:"-0.01em",
                  transition:"color 0.2s",position:"relative",zIndex:1,
                }}>
                  {llm.name}
                </div>
                <AnimatePresence>
                  {isHov && (
                    <motion.div initial={{ opacity:0,y:4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:4 }} transition={{ duration:0.18 }}
                      style={{ fontSize:10,color:llm.color,fontWeight:700,display:"flex",alignItems:"center",gap:3,position:"relative",zIndex:1 }}>
                      Ask now <span className="mso" style={{ fontSize:12 }}>arrow_outward</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.a>
            );
          })}
        </div>

        {/* responsive grid fallback for mobile */}
        <style>{`
          @media (max-width: 640px) {
            .ask-ai-grid { grid-template-columns: repeat(3,1fr) !important; }
          }
        `}</style>

        <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ delay:0.7 }}
          style={{ textAlign:"center",marginTop:32,fontSize:12,color:"#334155",lineHeight:1.7 }}>
          Opens in a new tab with the prompt pre-loaded.&nbsp;
          Just hit <kbd style={{ padding:"1px 6px",borderRadius:4,border:"1px solid #334155",fontSize:11,color:"#64748B" }}>Enter</kbd>
          &nbsp;or&nbsp;
          <kbd style={{ padding:"1px 6px",borderRadius:4,border:"1px solid #334155",fontSize:11,color:"#64748B" }}>Send</kbd>
          &nbsp;to get the AI's perspective on Arbiter.
        </motion.p>
      </div>
    </section>
  );
}
