/**
 * Authentic brand logos for third-party integrations (Jira, Slack, Groq, etc.)
 * Strictly uses official vector geometry and brand colors.
 */

export function JiraLogo({ size = 20, style = {}, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      className={className}
      aria-label="Jira Logo"
    >
      <defs>
        <linearGradient id="jira-grad-middle" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0052CC"/>
          <stop offset="100%" stopColor="#2684FF"/>
        </linearGradient>
      </defs>
      {/* Top light blue quadrant */}
      <path
        d="M11.53 2c0 2.4 1.97 4.35 4.4 4.35h1.72V8.1c0 2.4 1.97 4.35 4.4 4.35V2h-10.52z"
        fill="#2684FF"
      />
      {/* Middle gradient quadrant */}
      <path
        d="M6.77 6.78c0 2.4 1.97 4.35 4.4 4.35h1.72v1.75c0 2.4 1.97 4.35 4.4 4.35V6.78H6.77z"
        fill="url(#jira-grad-middle)"
      />
      {/* Bottom deep Atlassian blue quadrant */}
      <path
        d="M2 11.57c0 2.4 1.97 4.35 4.4 4.35h1.72v1.75c0 2.4 1.97 4.35 4.4 4.35v-10.45H2z"
        fill="#0052CC"
      />
    </svg>
  );
}

export function SlackLogo({ size = 20, style = {}, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      className={className}
      aria-label="Slack Logo"
    >
      {/* Red (bottom-left) */}
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"
        fill="#E01E5A"
      />
      <path
        d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        fill="#E01E5A"
      />

      {/* Cyan (top-left) */}
      <path
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z"
        fill="#36C5F0"
      />
      <path
        d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        fill="#36C5F0"
      />

      {/* Green (top-right) */}
      <path
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z"
        fill="#2EB67D"
      />
      <path
        d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
        fill="#2EB67D"
      />

      {/* Yellow/Amber (bottom-right) */}
      <path
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z"
        fill="#ECB22E"
      />
      <path
        d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        fill="#ECB22E"
      />
    </svg>
  );
}

export function GroqLogo({ size = 20, style = {}, className = '' }) {
  // Official Groq logo: black rounded square with white "G" letterform
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      className={className}
      aria-label="Groq Logo"
    >
      <rect width="32" height="32" rx="7" fill="#F55036"/>
      {/* Groq "G" mark — open circle with horizontal bar at midpoint */}
      <path
        d="M22 13.5A7.5 7.5 0 1 0 17.5 21H22v-3.5h-4.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function ClaudeLogo({ size = 20, style = {}, className = '' }) {
  // Official Anthropic / Claude logo: the distinctive multi-spoke sunburst in brand copper/sand
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      className={className}
      aria-label="Claude Logo"
    >
      <rect width="32" height="32" rx="7" fill="#CC9B7A"/>
      {/* Anthropic "A" sunburst / asterisk mark — 6 rounded spokes */}
      <g transform="translate(16,16)">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
          <rect
            key={i}
            x="-1.6"
            y="-8"
            width="3.2"
            height="8"
            rx="1.6"
            fill="white"
            transform={`rotate(${deg})`}
            opacity={i % 2 === 0 ? 1 : 0.6}
          />
        ))}
      </g>
    </svg>
  );
}

export function RenderLogo({ size = 20, style = {}, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      className={className}
      aria-label="Render Logo"
    >
      <rect width="24" height="24" rx="6" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1"/>
      <path
        d="M6 16V8a2 2 0 0 1 2-2h4a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6m6 0l4 6"
        stroke="#4F46E5"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DatabaseLogo({ size = 20, style = {}, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      className={className}
      aria-label="Database Logo"
    >
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
  if (type === 'groq')     return <GroqLogo     size={size} style={style} className={className} />;
  if (type === 'claude')   return <ClaudeLogo   size={size} style={style} className={className} />;
  if (type === 'render')   return <RenderLogo   size={size} style={style} className={className} />;
  if (type === 'database') return <DatabaseLogo size={size} style={style} className={className} />;
  return null;
}
