export function UploadAnimation() {
  return (
    <svg
      viewBox="0 0 480 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-md"
    >
      <defs>
        <filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neonSoft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Floor reflection ── */}
      <ellipse cx="240" cy="300" rx="200" ry="18" fill="#ef4444" opacity="0.03" />

      {/* ══════════ LEFT SERVER ══════════ */}
      <g>
        {/* Left face (front) */}
        <path
          d="M70,265 L130,295 L130,135 L70,105 Z"
          fill="#18181b"
          stroke="#2a2a2e"
          strokeWidth="0.8"
        />
        {/* Right face (side) */}
        <path
          d="M130,295 L170,275 L170,115 L130,135 Z"
          fill="#111114"
          stroke="#2a2a2e"
          strokeWidth="0.8"
        />
        {/* Top face */}
        <path
          d="M70,105 L130,135 L170,115 L110,85 Z"
          fill="#1f1f23"
          stroke="#2a2a2e"
          strokeWidth="0.8"
        />

        {/* Server panel (darker inset on front face) */}
        <path d="M78,120 L122,142 L122,270 L78,248 Z" fill="#111114" opacity="0.6" />

        {/* LED indicator strips on front face — neon red */}
        <line
          x1="82"
          y1="135"
          x2="118"
          y2="152"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#neonSoft)"
        >
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2s" repeatCount="indefinite" />
        </line>
        <line
          x1="82"
          y1="145"
          x2="118"
          y2="162"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#neonSoft)"
        >
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur="1.6s"
            begin="0.4s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="82"
          y1="155"
          x2="118"
          y2="172"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#neonSoft)"
        >
          <animate
            attributeName="opacity"
            values="0.4;0.85;0.4"
            dur="2.2s"
            begin="0.8s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="82"
          y1="165"
          x2="118"
          y2="182"
          stroke="#ef4444"
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#neonSoft)"
        >
          <animate
            attributeName="opacity"
            values="0.2;0.7;0.2"
            dur="1.8s"
            begin="1.2s"
            repeatCount="indefinite"
          />
        </line>

        {/* Drive bay slots on front face */}
        <line
          x1="82"
          y1="200"
          x2="118"
          y2="217"
          stroke="#27272a"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="82"
          y1="210"
          x2="118"
          y2="227"
          stroke="#27272a"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="82"
          y1="220"
          x2="118"
          y2="237"
          stroke="#27272a"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="82"
          y1="230"
          x2="118"
          y2="247"
          stroke="#27272a"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Small power LED */}
        <circle cx="86" cy="255" r="2" fill="#22c55e" filter="url(#neonSoft)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Ventilation grille on right/side face */}
        <line x1="135" y1="140" x2="165" y2="125" stroke="#1a1a1e" strokeWidth="1.5" />
        <line x1="135" y1="150" x2="165" y2="135" stroke="#1a1a1e" strokeWidth="1.5" />
        <line x1="135" y1="160" x2="165" y2="145" stroke="#1a1a1e" strokeWidth="1.5" />
        <line x1="135" y1="170" x2="165" y2="155" stroke="#1a1a1e" strokeWidth="1.5" />
        <line x1="135" y1="180" x2="165" y2="165" stroke="#1a1a1e" strokeWidth="1.5" />
        <line x1="135" y1="190" x2="165" y2="175" stroke="#1a1a1e" strokeWidth="1.5" />

        {/* Top indicator light */}
        <circle cx="120" cy="100" r="2.5" fill="#ef4444" opacity="0.5" filter="url(#neonSoft)">
          <animate
            attributeName="opacity"
            values="0.3;0.8;0.3"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      {/* ══════════ RIGHT SERVER ══════════ */}
      <g>
        {/* Left face (front) */}
        <path
          d="M300,265 L360,295 L360,135 L300,105 Z"
          fill="#18181b"
          stroke="#2a2a2e"
          strokeWidth="0.8"
        />
        {/* Right face (side) */}
        <path
          d="M360,295 L400,275 L400,115 L360,135 Z"
          fill="#111114"
          stroke="#2a2a2e"
          strokeWidth="0.8"
        />
        {/* Top face */}
        <path
          d="M300,105 L360,135 L400,115 L340,85 Z"
          fill="#1f1f23"
          stroke="#2a2a2e"
          strokeWidth="0.8"
        />

        {/* Server panel */}
        <path d="M308,120 L352,142 L352,270 L308,248 Z" fill="#111114" opacity="0.6" />

        {/* LED strips — neon cyan/blue */}
        <line
          x1="312"
          y1="135"
          x2="348"
          y2="152"
          stroke="#22d3ee"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#neonSoft)"
        >
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur="1.8s"
            begin="0.2s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="312"
          y1="145"
          x2="348"
          y2="162"
          stroke="#22d3ee"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#neonSoft)"
        >
          <animate
            attributeName="opacity"
            values="0.3;0.9;0.3"
            dur="2.1s"
            begin="0.6s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="312"
          y1="155"
          x2="348"
          y2="172"
          stroke="#22d3ee"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#neonSoft)"
        >
          <animate
            attributeName="opacity"
            values="0.4;0.85;0.4"
            dur="1.5s"
            begin="1s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="312"
          y1="165"
          x2="348"
          y2="182"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#neonSoft)"
        >
          <animate
            attributeName="opacity"
            values="0.3;0.75;0.3"
            dur="2.4s"
            begin="0.3s"
            repeatCount="indefinite"
          />
        </line>

        {/* Drive bays */}
        <line
          x1="312"
          y1="200"
          x2="348"
          y2="217"
          stroke="#27272a"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="312"
          y1="210"
          x2="348"
          y2="227"
          stroke="#27272a"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="312"
          y1="220"
          x2="348"
          y2="237"
          stroke="#27272a"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="312"
          y1="230"
          x2="348"
          y2="247"
          stroke="#27272a"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Power LED */}
        <circle cx="316" cy="255" r="2" fill="#22c55e" filter="url(#neonSoft)">
          <animate
            attributeName="opacity"
            values="0.6;1;0.6"
            dur="3s"
            begin="1.5s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Ventilation grille */}
        <line x1="365" y1="140" x2="395" y2="125" stroke="#1a1a1e" strokeWidth="1.5" />
        <line x1="365" y1="150" x2="395" y2="135" stroke="#1a1a1e" strokeWidth="1.5" />
        <line x1="365" y1="160" x2="395" y2="145" stroke="#1a1a1e" strokeWidth="1.5" />
        <line x1="365" y1="170" x2="395" y2="155" stroke="#1a1a1e" strokeWidth="1.5" />
        <line x1="365" y1="180" x2="395" y2="165" stroke="#1a1a1e" strokeWidth="1.5" />
        <line x1="365" y1="190" x2="395" y2="175" stroke="#1a1a1e" strokeWidth="1.5" />

        {/* Top indicator */}
        <circle cx="350" cy="100" r="2.5" fill="#22d3ee" opacity="0.5" filter="url(#neonSoft)">
          <animate
            attributeName="opacity"
            values="0.3;0.8;0.3"
            dur="1.5s"
            begin="0.7s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      {/* ══════════ CABLES ══════════ */}
      {/* Cable 1 (top) */}
      <path
        d="M170,175 L230,205 L300,170"
        stroke="#27272a"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cable 2 (middle) */}
      <path
        d="M170,195 L230,225 L300,190"
        stroke="#27272a"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cable 3 (bottom) */}
      <path
        d="M170,215 L230,245 L300,210"
        stroke="#27272a"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* ══════════ NEON DATA PARTICLES ══════════ */}

      {/* Cable 1 particles — red (left to right) */}
      <circle r="3.5" fill="#ef4444" filter="url(#neon)">
        <animateMotion
          dur="1.8s"
          repeatCount="indefinite"
          path="M170,175 L230,205 L300,170"
        />
        <animate attributeName="opacity" values="0;1;1;0" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle r="3.5" fill="#ef4444" filter="url(#neon)">
        <animateMotion
          dur="1.8s"
          begin="0.9s"
          repeatCount="indefinite"
          path="M170,175 L230,205 L300,170"
        />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          dur="1.8s"
          begin="0.9s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Cable 2 particles — cyan (right to left) */}
      <circle r="3.5" fill="#22d3ee" filter="url(#neon)">
        <animateMotion dur="2s" repeatCount="indefinite" path="M300,190 L230,225 L170,195" />
        <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle r="3.5" fill="#22d3ee" filter="url(#neon)">
        <animateMotion
          dur="2s"
          begin="1s"
          repeatCount="indefinite"
          path="M300,190 L230,225 L170,195"
        />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          dur="2s"
          begin="1s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Cable 3 particles — purple (left to right) */}
      <circle r="3" fill="#a855f7" filter="url(#neon)">
        <animateMotion
          dur="2.2s"
          begin="0.3s"
          repeatCount="indefinite"
          path="M170,215 L230,245 L300,210"
        />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          dur="2.2s"
          begin="0.3s"
          repeatCount="indefinite"
        />
      </circle>
      <circle r="3" fill="#a855f7" filter="url(#neon)">
        <animateMotion
          dur="2.2s"
          begin="1.4s"
          repeatCount="indefinite"
          path="M170,215 L230,245 L300,210"
        />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          dur="2.2s"
          begin="1.4s"
          repeatCount="indefinite"
        />
      </circle>

      {/* ── Extra small particles for density ── */}
      <circle r="2" fill="#ef4444" opacity="0.6" filter="url(#neonSoft)">
        <animateMotion
          dur="1.4s"
          begin="0.3s"
          repeatCount="indefinite"
          path="M170,175 L230,205 L300,170"
        />
        <animate
          attributeName="opacity"
          values="0;0.6;0.6;0"
          dur="1.4s"
          begin="0.3s"
          repeatCount="indefinite"
        />
      </circle>
      <circle r="2" fill="#22d3ee" opacity="0.6" filter="url(#neonSoft)">
        <animateMotion
          dur="1.6s"
          begin="0.5s"
          repeatCount="indefinite"
          path="M300,190 L230,225 L170,195"
        />
        <animate
          attributeName="opacity"
          values="0;0.6;0.6;0"
          dur="1.6s"
          begin="0.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle r="2" fill="#a855f7" opacity="0.6" filter="url(#neonSoft)">
        <animateMotion
          dur="1.8s"
          begin="0.8s"
          repeatCount="indefinite"
          path="M170,215 L230,245 L300,210"
        />
        <animate
          attributeName="opacity"
          values="0;0.6;0.6;0"
          dur="1.8s"
          begin="0.8s"
          repeatCount="indefinite"
        />
      </circle>

      {/* ── Cable glow trails ── */}
      <path
        d="M170,175 L230,205 L300,170"
        stroke="#ef4444"
        strokeWidth="1"
        fill="none"
        opacity="0.15"
        filter="url(#neonSoft)"
      />
      <path
        d="M170,195 L230,225 L300,190"
        stroke="#22d3ee"
        strokeWidth="1"
        fill="none"
        opacity="0.15"
        filter="url(#neonSoft)"
      />
      <path
        d="M170,215 L230,245 L300,210"
        stroke="#a855f7"
        strokeWidth="1"
        fill="none"
        opacity="0.15"
        filter="url(#neonSoft)"
      />

    </svg>
  );
}
