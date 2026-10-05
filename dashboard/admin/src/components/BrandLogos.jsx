/**
 * Authentic brand logos for third-party integrations.
 * All logos match their official brand identities.
 */

export function JiraLogo({ size = 20, style = {}, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ display:'inline-block', verticalAlign:'middle', flexShrink:0, ...style }} className={className} aria-label="Jira">
      <defs>
        <linearGradient id="jira-g" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0052CC"/><stop offset="100%" stopColor="#2684FF"/>
        </linearGradient>
      </defs>
      <path d="M11.53 2c0 2.4 1.97 4.35 4.4 4.35h1.72V8.1c0 2.4 1.97 4.35 4.4 4.35V2h-10.52z" fill="#2684FF"/>
      <path d="M6.77 6.78c0 2.4 1.97 4.35 4.4 4.35h1.72v1.75c0 2.4 1.97 4.35 4.4 4.35V6.78H6.77z" fill="url(#jira-g)"/>
      <path d="M2 11.57c0 2.4 1.97 4.35 4.4 4.35h1.72v1.75c0 2.4 1.97 4.35 4.4 4.35v-10.45H2z" fill="#0052CC"/>
    </svg>
  );
}

export function SlackLogo({ size = 20, style = {}, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ display:'inline-block', verticalAlign:'middle', flexShrink:0, ...style }} className={className} aria-label="Slack">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/>
      <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
      <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/>
      <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/>
      <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
    </svg>
  );
}

/**
 * Groq official logo — uses the real groq-logo.webp asset.
 * Falls back to a styled img with object-fit contain.
 */
export function GroqLogo({ size = 20, style = {}, className = '' }) {
  return (
    <img
      src="/groq-logo.webp"
      alt="Groq"
      width={size * 3}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}

/**
 * Groq icon-only variant — square crop of the real logo.
 */
export function GroqIcon({ size = 20, style = {}, className = '' }) {
  return (
    <img
      src="/groq-logo.webp"
      alt="Groq"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}

/**
 * Claude / Anthropic official logo — uses the real claude-logo.webp asset.
 */
export function ClaudeLogo({ size = 20, style = {}, className = '' }) {
  return (
    <img
      src="/claude-logo.webp"
      alt="Claude"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}

export function RenderLogo({ size = 20, style = {}, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ display:'inline-block', verticalAlign:'middle', flexShrink:0, ...style }} className={className} aria-label="Render">
      <rect width="24" height="24" rx="6" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1"/>
      <path d="M6 16V8a2 2 0 0 1 2-2h4a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6m6 0l4 6" stroke="#4F46E5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function DatabaseLogo({ size = 20, style = {}, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ display:'inline-block', verticalAlign:'middle', flexShrink:0, ...style }} className={className} aria-label="Database">
      <rect width="24" height="24" rx="6" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1"/>
      <ellipse cx="12" cy="7" rx="6" ry="2.2" stroke="#059669" strokeWidth="1.8"/>
      <path d="M6 7v5c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V7" stroke="#059669" strokeWidth="1.8"/>
      <path d="M6 12v5c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2v-5" stroke="#059669" strokeWidth="1.8"/>
    </svg>
  );
}

export function ServiceBrandIcon({ type, size = 20, style = {}, className = '' }) {
  if (type === 'jira')     return <JiraLogo     size={size} style={style} className={className} />;
  if (type === 'slack')    return <SlackLogo    size={size} style={style} className={className} />;
  if (type === 'groq')     return <GroqIcon     size={size} style={style} className={className} />;
  if (type === 'claude')   return <ClaudeLogo   size={size} style={style} className={className} />;
  if (type === 'render')   return <RenderLogo   size={size} style={style} className={className} />;
  if (type === 'database') return <DatabaseLogo size={size} style={style} className={className} />;
  return null;
}
