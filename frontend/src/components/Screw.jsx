// High-fidelity skeuomorphic hardware fastener screw
export default function Screw({ size = 10, angle = 42, style = {} }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #475569 0%, #1E293B 55%, #334155 100%)',
        boxShadow: `
          inset 0 1px 1px rgba(255, 255, 255, 0.4),
          inset 0 -1px 2px rgba(0, 0, 0, 0.8),
          0 1px 2px rgba(0, 0, 0, 0.6)
        `,
        border: '0.5px solid rgba(0, 0, 0, 0.7)',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Slotted head indentation */}
      <div
        style={{
          width: Math.max(1.5, size * 0.18),
          height: size * 0.62,
          borderRadius: 1,
          background: '#0B0F19',
          boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.9), 0 0.5px 0.5px rgba(255,255,255,0.25)',
          transform: `rotate(${angle}deg)`,
        }}
      />
    </div>
  );
}