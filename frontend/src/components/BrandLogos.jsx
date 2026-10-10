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
 * Groq official logo — official vector wordmark, transparent background.
 * Color: #F55036 (Groq brand orange-red).
 */
export function GroqLogo({ size = 20, style = {}, className = '' }) {
  return (
    <img
      src="/groq-logo.svg"
      alt="Groq"
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        height: size,
        width: 'auto',
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}

/**
 * Groq icon — same wordmark at compact size.
 */
export function GroqIcon({ size = 20, style = {}, className = '' }) {
  return (
    <img
      src="/groq-logo.svg"
      alt="Groq"
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        height: size,
        width: 'auto',
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}

/**
 * Claude / Anthropic logo — official sunburst SVG from simple-icons.
 * theme='dark' → terracotta on transparent (for dark backgrounds).
 * theme='light' → same terracotta (visible on light backgrounds too).
 * No images, no checkerboards, scales perfectly at any size.
 */
export function ClaudeLogo({ size = 20, theme = 'dark', iconOnly = false, style = {}, className = '' }) {
  // Official Claude icon path (simple-icons, CC0)
  const fill = theme === 'dark' ? '#E8856A' : '#C96442';
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      aria-label="Claude"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <path fill={fill} d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/>
    </svg>
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
