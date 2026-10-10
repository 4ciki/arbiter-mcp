import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * ArbiterLogo — Multi-mode animated Arbiter MCP icon.
 *
 * Modes (via `animate` prop):
 *   - 'assemble'  : The two halves (teal & amber) fly in from opposite directions,
 *                   snap together at the center with a spring shockwave ring and seam flash!
 *   - 'gyro'      : Creative 3D gyroscope with dual counter-rotating orbital rings (teal + amber)
 *                   and 3D perspective gimbal tilt on the diamond icon.
 *   - 'orbit'     : Orbital ring rotating around the icon.
 *   - 'breathe'   : Dual teal+amber ambient luminous breathing glow.
 *   - 'spin'      : Continuous smooth rotation.
 *   - true        : Defaults to 'gyro'.
 *   - false       : Static icon.
 *
 * Props:
 *   size      — px dimensions (default 40)
 *   animate   — animation mode string or boolean
 *   loading   — renders high-class full-screen loading splash with converging halves & orbital rings
 *   rounded   — rounded corners (default true)
 *   interactive — separates halves on hover with magnetic spring snap (default true)
 */
export default function ArbiterLogo({
  size = 40,
  animate = false,
  loading = false,
  rounded = true,
  interactive = true,
  className = '',
  style = {},
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [assembledKey, setAssembledKey] = useState(0);

  // Normalize mode
  const mode = animate === true ? 'gyro' : animate;

  // Full-screen loading screen
  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 50%, #F0FDF4 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
      }}>
        {/* Ambient background light radial */}
        <div style={{
          position: 'absolute', width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,188,156,0.12) 0%, rgba(243,156,18,0.08) 50%, transparent 70%)',
          filter: 'blur(30px)', pointerEvents: 'none',
        }}/>

        {/* 3D Gyroscope + Converging Core */}
        <div style={{
          position: 'relative', width: 140, height: 140,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          perspective: 800, marginBottom: 32,
        }}>
          {/* Outer Teal 3D Orbit Ring */}
          <div className="animate-orbit-cw" style={{
            position: 'absolute', width: 136, height: 136, borderRadius: '50%',
            border: '2px dashed rgba(26,188,156,0.45)',
            boxShadow: '0 0 16px rgba(26,188,156,0.25)',
            transformStyle: 'preserve-3d',
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', top: -4, left: '50%', width: 8, height: 8,
              borderRadius: '50%', background: '#1ABC9C',
              boxShadow: '0 0 10px #1ABC9C, 0 0 20px #1ABC9C',
            }}/>
          </div>

          {/* Inner Amber 3D Counter-Orbit Ring */}
          <div className="animate-orbit-ccw" style={{
            position: 'absolute', width: 114, height: 114, borderRadius: '50%',
            border: '1.5px solid rgba(243,156,18,0.4)',
            boxShadow: '0 0 14px rgba(243,156,18,0.2)',
            transformStyle: 'preserve-3d',
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', bottom: -4, left: '50%', width: 7, height: 7,
              borderRadius: '50%', background: '#F39C12',
              boxShadow: '0 0 10px #F39C12, 0 0 18px #F39C12',
            }}/>
          </div>

          {/* Central Logo with assembling halves & pulse */}
          <div style={{ position: 'relative', width: 90, height: 90 }}>
            {/* Shockwave expanding ring */}
            <motion.div
              animate={{ scale: [0.8, 1.7, 0.8], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute', inset: -12, borderRadius: 28,
                border: '2px solid rgba(26,188,156,0.35)',
              }}
            />

            {/* Left Half (Teal) */}
            <motion.div
              animate={{
                x: [-18, 0, -18],
                rotateY: [-22, 0, -22],
                filter: [
                  'drop-shadow(-4px 0 12px rgba(26,188,156,0.6))',
                  'drop-shadow(0 0 8px rgba(26,188,156,0.3))',
                  'drop-shadow(-4px 0 12px rgba(26,188,156,0.6))',
                ]
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: 0,
                clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)',
              }}
            >
              <img
                src="/arbiter-icon.png"
                alt="Arbiter Left"
                style={{ width: '100%', height: '100%', borderRadius: 20, display: 'block' }}
              />
            </motion.div>

            {/* Right Half (Amber) */}
            <motion.div
              animate={{
                x: [18, 0, 18],
                rotateY: [22, 0, 22],
                filter: [
                  'drop-shadow(4px 0 12px rgba(243,156,18,0.6))',
                  'drop-shadow(0 0 8px rgba(243,156,18,0.3))',
                  'drop-shadow(4px 0 12px rgba(243,156,18,0.6))',
                ]
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: 0,
                clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)',
              }}
            >
              <img
                src="/arbiter-icon.png"
                alt="Arbiter Right"
                style={{ width: '100%', height: '100%', borderRadius: 20, display: 'block' }}
              />
            </motion.div>
          </div>
        </div>

        {/* Brand title */}
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 800,
          color: '#0F172A', letterSpacing: '-0.03em',
          marginBottom: 6,
        }}>
          Arbiter MCP
        </div>

        <div style={{
          fontSize: 13, color: '#64748B',
          fontFamily: "'Inter', sans-serif",
          marginBottom: 24,
        }}>
          Synchronizing intelligent AI agent workspace…
        </div>

        {/* Shimmer progress bar */}
        <div style={{
          width: 220, height: 3,
          background: '#E2E8F0', borderRadius: 2,
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent, #1ABC9C, #F39C12, transparent)',
            animation: 'shimmer-bar 1.5s ease-in-out infinite',
          }}/>
        </div>
      </div>
    );
  }

  // 1. ASSEMBLE MODE: Left & Right halves fly in from opposite directions and snap together!
  if (mode === 'assemble') {
    return (
      <div
        key={assembledKey}
        onClick={() => setAssembledKey(k => k + 1)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Click to replay assembly animation"
        style={{
          position: 'relative',
          width: size,
          height: size,
          cursor: 'pointer',
          perspective: 600,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
        className={className}
      >
        {/* Shockwave burst on impact */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.6, 1.6, 1.9], opacity: [0.85, 0.4, 0] }}
          transition={{ delay: 0.28, duration: 0.65, ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: -4,
            borderRadius: rounded ? size * 0.28 : 8,
            border: '2px solid rgba(26,188,156,0.6)',
            boxShadow: '0 0 18px rgba(243,156,18,0.4)',
            pointerEvents: 'none',
          }}
        />

        {/* Left half (Teal) swoops in from the left */}
        <motion.div
          initial={{ x: -size * 0.85, y: -size * 0.2, rotate: -22, opacity: 0 }}
          animate={{
            x: isHovered ? -4 : 0,
            y: 0,
            rotate: 0,
            opacity: 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 17,
            mass: 0.85,
          }}
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)',
            filter: 'drop-shadow(-2px 0 8px rgba(26,188,156,0.45))',
          }}
        >
          <img
            src="/arbiter-icon-transparent.png"
            alt="Arbiter Teal Half"
            style={{
              width: size,
              height: size,
              borderRadius: rounded ? size * 0.22 : 0,
              display: 'block',
              objectFit: 'cover',
            }}
          />
        </motion.div>

        {/* Right half (Amber) swoops in from the right */}
        <motion.div
          initial={{ x: size * 0.85, y: size * 0.2, rotate: 22, opacity: 0 }}
          animate={{
            x: isHovered ? 4 : 0,
            y: 0,
            rotate: 0,
            opacity: 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 17,
            mass: 0.85,
          }}
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)',
            filter: 'drop-shadow(2px 0 8px rgba(243,156,18,0.45))',
          }}
        >
          <img
            src="/arbiter-icon-transparent.png"
            alt="Arbiter Amber Half"
            style={{
              width: size,
              height: size,
              borderRadius: rounded ? size * 0.22 : 0,
              display: 'block',
              objectFit: 'cover',
            }}
          />
        </motion.div>

        {/* Center seam flash upon uniting */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: [0, 1, 0], scaleY: [0.4, 1.2, 0.8] }}
          transition={{ delay: 0.26, duration: 0.45, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: 'calc(50% - 1px)',
            top: '15%',
            width: 2,
            height: '70%',
            background: 'linear-gradient(180deg, #1ABC9C, #FFFFFF, #F39C12)',
            boxShadow: '0 0 8px #FFFFFF, 0 0 12px #1ABC9C',
            pointerEvents: 'none',
          }}
        />
      </div>
    );
  }

  // 2. GYRO / ORBIT MODE: 3D Counter-rotating orbital rings with 3D diamond perspective
  if (mode === 'gyro' || mode === 'orbit') {
    const ringSize = size * 1.48;
    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: 600,
          ...style,
        }}
        className={className}
      >
        {/* Outer Teal 3D Orbit Ring */}
        <div
          className="animate-orbit-cw"
          style={{
            position: 'absolute',
            width: ringSize,
            height: ringSize,
            borderRadius: '50%',
            border: '1.5px dashed rgba(26,188,156,0.5)',
            boxShadow: '0 0 10px rgba(26,188,156,0.25)',
            transformStyle: 'preserve-3d',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'absolute', top: -3, left: '50%', width: Math.max(4, size * 0.08), height: Math.max(4, size * 0.08),
            borderRadius: '50%', background: '#1ABC9C',
            boxShadow: '0 0 6px #1ABC9C',
          }}/>
        </div>

        {/* Inner Amber Counter-Orbit Ring */}
        <div
          className="animate-orbit-ccw"
          style={{
            position: 'absolute',
            width: ringSize * 0.85,
            height: ringSize * 0.85,
            borderRadius: '50%',
            border: '1px solid rgba(243,156,18,0.45)',
            boxShadow: '0 0 8px rgba(243,156,18,0.2)',
            transformStyle: 'preserve-3d',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'absolute', bottom: -3, left: '50%', width: Math.max(3, size * 0.07), height: Math.max(3, size * 0.07),
            borderRadius: '50%', background: '#F39C12',
            boxShadow: '0 0 6px #F39C12',
          }}/>
        </div>

        {/* Central Icon with gentle 3D gyro tilt */}
        <motion.div
          animate={{
            rotateY: isHovered ? [-15, 15, -15] : [-7, 7, -7],
            rotateX: isHovered ? [8, -8, 8] : [4, -4, 4],
          }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: size,
            height: size,
            transformStyle: 'preserve-3d',
            filter: 'drop-shadow(0 4px 16px rgba(26,188,156,0.35)) drop-shadow(0 0 12px rgba(243,156,18,0.2))',
          }}
        >
          <img
            src="/arbiter-icon-transparent.png"
            alt="Arbiter MCP"
            style={{
              width: size,
              height: size,
              borderRadius: rounded ? size * 0.22 : 0,
              display: 'block',
              objectFit: 'cover',
            }}
          />
        </motion.div>
      </div>
    );
  }

  // 3. FLOAT / BREATHE / SPIN OR STATIC
  const animClass = {
    breathe: 'animate-icon-breathe',
    float:   'animate-icon-float',
    spin:    'animate-spin',
  }[mode] || '';

  return (
    <motion.div
      whileHover={interactive ? { scale: 1.08, rotate: [0, -3, 3, 0] } : undefined}
      transition={{ type: 'spring', stiffness: 350, damping: 18 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      className={className}
    >
      <img
        src="/arbiter-icon-transparent.png"
        alt="Arbiter MCP"
        className={animClass}
        style={{
          width: size,
          height: size,
          borderRadius: rounded ? size * 0.22 : 0,
          display: 'block',
          flexShrink: 0,
          objectFit: 'cover',
        }}
      />
    </motion.div>
  );
}