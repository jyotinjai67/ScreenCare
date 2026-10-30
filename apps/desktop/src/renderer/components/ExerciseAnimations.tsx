import React from 'react';

/**
 * Animated SVG Illustration: Stretch Break
 * Displays seated office worker demonstrating a smooth left-center-right stretching movement,
 * matching the visual reference image with chair, desk, plant, directional arrows, and ghost guide poses.
 */
export const StretchBreakAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg
        viewBox="0 0 300 210"
        className="exercise-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="tealSweatshirt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Ambient Floor Shadow */}
        <ellipse cx="150" cy="198" rx="80" ry="6" fill="rgba(15, 23, 42, 0.06)" />

        {/* Background Desk & Laptop (Right side) */}
        <g opacity="0.4">
          <rect x="222" y="132" width="68" height="3" rx="1.5" fill="#cbd5e1" />
          <line x1="230" y1="135" x2="230" y2="195" stroke="#cbd5e1" strokeWidth="2.5" />
          <line x1="280" y1="135" x2="280" y2="195" stroke="#cbd5e1" strokeWidth="2.5" />
          {/* Laptop silhouette */}
          <rect x="242" y="115" width="26" height="17" rx="2" fill="#94a3b8" />
          <line x1="238" y1="132" x2="272" y2="132" stroke="#64748b" strokeWidth="2" />
        </g>

        {/* Background Potted Plant (Left side) */}
        <g opacity="0.85">
          <ellipse cx="48" cy="196" rx="15" ry="3" fill="rgba(0,0,0,0.06)" />
          {/* Plant pot */}
          <polygon points="38,195 58,195 62,165 34,165" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
          {/* Leaves */}
          <path d="M 48 165 C 36 150 24 145 26 132 C 36 134 44 148 48 165 Z" fill="#059669" />
          <path d="M 48 165 C 54 145 66 138 70 125 C 60 130 52 148 48 165 Z" fill="#10b981" />
          <path d="M 48 165 C 46 140 38 120 46 105 C 52 122 51 145 48 165 Z" fill="#047857" />
          <path d="M 48 165 C 50 142 60 135 58 118 C 52 132 49 150 48 165 Z" fill="#34d399" />
        </g>

        {/* Office Chair Base (Legs, Casters & Cylinder) */}
        <g>
          <path
            d="M 150 180 L 122 193 M 150 180 L 178 193 M 150 180 L 150 196 M 150 180 L 134 195 M 150 180 L 166 195"
            stroke="#1e293b"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="122" cy="193" r="2.5" fill="#0f172a" />
          <circle cx="178" cy="193" r="2.5" fill="#0f172a" />
          <circle cx="150" cy="196" r="2.5" fill="#0f172a" />
          <rect x="147" y="152" width="6" height="28" rx="2" fill="#334155" />
          {/* Chair Seat */}
          <rect x="122" y="148" width="56" height="10" rx="4" fill="#1e293b" />
          {/* Chair Back Support */}
          <rect x="146" y="115" width="8" height="35" rx="3" fill="#1e293b" />
          {/* Chair Backrest */}
          <rect x="126" y="80" width="48" height="52" rx="10" fill="#334155" />
          {/* Armrests */}
          <path d="M 120 125 L 120 144" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="114" y="122" width="12" height="4" rx="2" fill="#0f172a" />
          <path d="M 180 125 L 180 144" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="174" y="122" width="12" height="4" rx="2" fill="#0f172a" />
        </g>

        {/* Translucent Ghost Silhouette 1: Left Stretch Guide (Matches reference image) */}
        <g opacity="0.22" transform="translate(10, 0)">
          <path d="M 132 150 C 130 115 120 95 125 90 L 140 86 C 148 90 152 115 156 150 Z" fill="#0d9488" />
          <circle cx="128" cy="72" r="11" fill="#0d9488" />
          <path d="M 148 92 C 158 84 156 68 142 58 C 132 52 120 56 112 62" stroke="#0d9488" strokeWidth="8" strokeLinecap="round" fill="none" />
        </g>

        {/* Translucent Ghost Silhouette 2: Right Stretch Guide (Matches reference image) */}
        <g opacity="0.22" transform="translate(-10, 0)">
          <path d="M 144 150 C 148 115 158 95 155 90 L 140 86 C 132 90 128 115 124 150 Z" fill="#0d9488" />
          <circle cx="152" cy="72" r="11" fill="#0d9488" />
          <path d="M 132 92 C 122 84 124 68 138 58 C 148 52 160 56 168 62" stroke="#0d9488" strokeWidth="8" strokeLinecap="round" fill="none" />
        </g>

        {/* Character Lower Body (Stays stable on chair cushion) */}
        <g>
          {/* Left leg */}
          <path d="M 134 148 L 125 184" stroke="#1e293b" strokeWidth="13" strokeLinecap="round" />
          {/* Right leg */}
          <path d="M 166 148 L 175 184" stroke="#1e293b" strokeWidth="13" strokeLinecap="round" />
          {/* Left sneaker */}
          <path d="M 116 190 C 116 185 125 183 133 186 C 133 190 125 192 116 190 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="116" y1="190" x2="133" y2="190" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          {/* Right sneaker */}
          <path d="M 184 190 C 184 185 175 183 167 186 C 167 190 175 192 184 190 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="167" y1="190" x2="184" y2="190" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* ====================================================================
            ANIMATED ACTIVE CHARACTER: Smooth Torso Stretch Loop (Left -> Center -> Right -> Center)
            Pivoting smoothly from hips/waist (150px, 148px)
           ==================================================================== */}
        <g className="stretch-animated-character">
          {/* Torso / Teal Sweatshirt */}
          <path
            d="M 133 150 C 133 120 135 102 142 98 L 158 98 C 165 102 167 120 167 150 Z"
            fill="url(#tealSweatshirt)"
            filter="url(#cardShadow)"
          />
          <path d="M 143 98 Q 150 104 157 98" stroke="#0f766e" strokeWidth="2" fill="none" />

          {/* Neck */}
          <rect x="146" y="87" width="8" height="12" rx="3" fill="#fbcfe8" />

          {/* Head & Face */}
          <g>
            <circle cx="137" cy="74" r="3.5" fill="#fbcfe8" />
            <circle cx="163" cy="74" r="3.5" fill="#fbcfe8" />
            <rect x="139" y="60" width="22" height="26" rx="9" fill="#fbcfe8" />
            {/* Hair */}
            <path
              d="M 138 68 C 138 56 142 50 150 50 C 158 50 162 56 162 68 C 159 64 154 62 150 63 C 146 62 141 64 138 68 Z"
              fill="#1e293b"
            />
            {/* Gentle closed smiling eyes */}
            <path d="M 143 73 Q 146 76 148 73" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 152 73 Q 154 76 157 73" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 147 79 Q 150 82 153 79" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>

          {/* LEFT-STRETCH ARMS (Right arm stretches overhead to left; left arm down) */}
          <g className="stretch-arms-left-phase">
            {/* Right Arm: curving overhead stretching to left */}
            <path
              d="M 166 102 C 176 94 176 76 164 63 C 156 55 140 56 132 60"
              stroke="url(#tealSweatshirt)"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="130" cy="61" r="4.5" fill="#fbcfe8" />

            {/* Left Arm: resting down along chair side */}
            <path
              d="M 134 102 C 126 114 122 130 128 148"
              stroke="url(#tealSweatshirt)"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="128" cy="150" r="4.5" fill="#fbcfe8" />
          </g>

          {/* RIGHT-STRETCH ARMS (Left arm stretches overhead to right; right arm down) */}
          <g className="stretch-arms-right-phase">
            {/* Left Arm: curving overhead stretching to right */}
            <path
              d="M 134 102 C 124 94 124 76 136 63 C 144 55 160 56 168 60"
              stroke="url(#tealSweatshirt)"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="170" cy="61" r="4.5" fill="#fbcfe8" />

            {/* Right Arm: resting down along chair side */}
            <path
              d="M 166 102 C 174 114 178 130 172 148"
              stroke="url(#tealSweatshirt)"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="172" cy="150" r="4.5" fill="#fbcfe8" />
          </g>
        </g>

        {/* Directional Curved Teal Motion Arrows (Pulsing in sync with motion) */}
        {/* Left Arrow */}
        <g className="arrow-left-pulse">
          <path
            d="M 115 65 C 100 75 95 95 105 110"
            stroke="url(#arrowGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="4 3"
            fill="none"
          />
          <polygon points="103,113 111,108 107,103" fill="#0d9488" />
        </g>

        {/* Right Arrow */}
        <g className="arrow-right-pulse">
          <path
            d="M 185 65 C 200 75 205 95 195 110"
            stroke="url(#arrowGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="4 3"
            fill="none"
          />
          <polygon points="197,113 189,108 193,103" fill="#0d9488" />
        </g>

        {/* Gentle Motion Accents */}
        <g opacity="0.8">
          <circle cx="110" cy="90" r="1.5" fill="#0d9488" className="sparkle-1" />
          <circle cx="190" cy="90" r="1.5" fill="#0d9488" className="sparkle-2" />
        </g>
      </svg>
    </div>
  );
};

/**
 * Animated SVG Illustration: Eye Break (20-20-20 Rule)
 * Person sitting at desk looking at screen, then smoothly turning head and gaze towards
 * distant scenic window, blinking softly, resting eyes, and returning to center.
 */
export const EyeBreakAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg
        viewBox="0 0 300 210"
        className="exercise-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#f0fdf4" />
          </linearGradient>
        </defs>

        <ellipse cx="140" cy="198" rx="70" ry="7" fill="rgba(15, 23, 42, 0.06)" />

        {/* Window with Distant Mountain/Sky on Left */}
        <g>
          <rect x="25" y="40" width="75" height="110" rx="6" fill="url(#skyGrad)" stroke="#cbd5e1" strokeWidth="2.5" />
          <circle cx="75" cy="65" r="10" fill="#fef08a" opacity="0.8" />
          <path d="M 25 130 Q 55 90 85 125 L 100 150 L 25 150 Z" fill="#34d399" opacity="0.7" />
          <path d="M 45 140 Q 75 110 100 135 L 100 150 L 45 150 Z" fill="#059669" opacity="0.8" />
          <line x1="25" y1="95" x2="100" y2="95" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="62" y1="40" x2="62" y2="150" stroke="#cbd5e1" strokeWidth="2" />
        </g>

        {/* Computer Screen on Right */}
        <g opacity="0.8">
          <rect x="200" y="75" width="65" height="50" rx="4" fill="#1e293b" />
          <rect x="204" y="79" width="57" height="42" rx="2" fill="#38bdf8" opacity="0.8" />
          <rect x="228" y="125" width="8" height="25" fill="#64748b" />
          <ellipse cx="232" cy="150" rx="20" ry="3" fill="#94a3b8" />
        </g>

        {/* Office Chair */}
        <rect x="122" y="148" width="56" height="10" rx="4" fill="#1e293b" />
        <rect x="146" y="115" width="8" height="35" rx="3" fill="#1e293b" />
        <rect x="126" y="80" width="48" height="52" rx="10" fill="#334155" />
        <path d="M 150 180 L 120 193 M 150 180 L 180 193 M 150 180 L 150 196" stroke="#1e293b" strokeWidth="3" />

        {/* Character Legs */}
        <path d="M 134 148 L 128 184" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
        <path d="M 166 148 L 172 184" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
        <path d="M 120 190 C 120 185 130 184 136 186 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
        <path d="M 180 190 C 180 185 170 184 164 186 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />

        {/* Character Torso */}
        <path
          d="M 132 150 C 132 120 134 102 142 98 L 158 98 C 166 102 168 120 168 150 Z"
          fill="#0284c7"
        />

        {/* ANIMATED HEAD & GAZE (Turns towards window on left, blinks, gazes far, returns) */}
        <g className="eye-break-animated-head">
          <rect x="146" y="87" width="8" height="12" rx="3" fill="#fbcfe8" />
          <circle cx="137" cy="74" r="3.5" fill="#fbcfe8" />
          <circle cx="163" cy="74" r="3.5" fill="#fbcfe8" />
          <rect x="139" y="60" width="22" height="26" rx="9" fill="#fbcfe8" />
          <path
            d="M 138 68 C 138 56 142 50 150 50 C 158 50 162 56 162 68 C 159 64 154 62 150 63 C 146 62 141 64 138 68 Z"
            fill="#1e293b"
          />

          {/* Animated Eyes (Shift gaze left towards window) */}
          <g className="eye-break-pupils">
            <circle cx="145" cy="73" r="2.2" fill="#0f172a" />
            <circle cx="155" cy="73" r="2.2" fill="#0f172a" />
          </g>
          <path d="M 147 80 Q 150 83 153 80" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>

        {/* Distance Vision Waves when looking far */}
        <g className="vision-stars">
          <circle cx="85" cy="75" r="2.2" fill="#38bdf8" />
          <circle cx="102" cy="65" r="1.8" fill="#2dd4bf" />
          <path d="M 125 70 Q 105 70 85 75" stroke="#38bdf8" strokeWidth="1.8" strokeDasharray="3 3" fill="none" />
        </g>
      </svg>
    </div>
  );
};

/**
 * Animated SVG Illustration: Neck & Shoulder Stretch
 * Person gently tilting head to stretch neck, rolling shoulders back, then tilting to right.
 */
export const NeckShoulderAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg
        viewBox="0 0 300 210"
        className="exercise-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="150" cy="198" rx="70" ry="7" fill="rgba(15, 23, 42, 0.06)" />

        {/* Office Chair */}
        <rect x="122" y="148" width="56" height="10" rx="4" fill="#1e293b" />
        <rect x="146" y="115" width="8" height="35" rx="3" fill="#1e293b" />
        <rect x="126" y="80" width="48" height="52" rx="10" fill="#334155" />
        <path d="M 150 180 L 120 193 M 150 180 L 180 193 M 150 180 L 150 196" stroke="#1e293b" strokeWidth="3" />

        {/* Legs */}
        <path d="M 134 148 L 128 184" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
        <path d="M 166 148 L 172 184" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
        <path d="M 120 190 C 120 185 130 184 136 186 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
        <path d="M 180 190 C 180 185 170 184 164 186 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />

        {/* ANIMATED SHOULDERS (Rolling in a smooth circle) */}
        <g className="neck-animated-shoulders">
          <path
            d="M 132 150 C 132 120 134 102 142 98 L 158 98 C 166 102 168 120 168 150 Z"
            fill="#0d9488"
          />
          <path d="M 134 102 L 126 145" stroke="#0d9488" strokeWidth="9" strokeLinecap="round" />
          <path d="M 166 102 L 174 145" stroke="#0d9488" strokeWidth="9" strokeLinecap="round" />
          <circle cx="126" cy="147" r="4" fill="#fbcfe8" />
          <circle cx="174" cy="147" r="4" fill="#fbcfe8" />
        </g>

        {/* ANIMATED HEAD (Tilts left, upright with shoulder roll, tilts right) */}
        <g className="neck-animated-head">
          <rect x="146" y="87" width="8" height="12" rx="3" fill="#fbcfe8" />
          <circle cx="137" cy="74" r="3.5" fill="#fbcfe8" />
          <circle cx="163" cy="74" r="3.5" fill="#fbcfe8" />
          <rect x="139" y="60" width="22" height="26" rx="9" fill="#fbcfe8" />
          <path
            d="M 138 68 C 138 56 142 50 150 50 C 158 50 162 56 162 68 C 159 64 154 62 150 63 C 146 62 141 64 138 68 Z"
            fill="#1e293b"
          />
          <path d="M 143 73 Q 146 76 148 73" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 152 73 Q 154 76 157 73" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 147 79 Q 150 82 153 79" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>

        {/* Neck stretch motion ripples */}
        <g className="neck-motion-ripples">
          <path d="M 130 80 Q 126 88 132 96" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M 170 80 Q 174 88 168 96" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
};

/**
 * Animated SVG Illustration: Water Reminder
 * Person lifting a glass of water, taking a refreshing sip, and setting it down.
 */
export const WaterReminderAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg
        viewBox="0 0 300 210"
        className="exercise-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="150" cy="198" rx="70" ry="7" fill="rgba(15, 23, 42, 0.06)" />

        {/* Desk with Coaster */}
        <rect x="70" y="145" width="160" height="4" rx="2" fill="#cbd5e1" />
        <ellipse cx="185" cy="146" rx="12" ry="3" fill="#94a3b8" />

        {/* Character Torso & Chair */}
        <rect x="122" y="148" width="56" height="10" rx="4" fill="#1e293b" />
        <path
          d="M 132 150 C 132 120 134 102 142 98 L 158 98 C 166 102 168 120 168 150 Z"
          fill="#0284c7"
        />

        {/* Left Arm Resting */}
        <path d="M 134 102 L 120 145" stroke="#0284c7" strokeWidth="9" strokeLinecap="round" />
        <circle cx="120" cy="146" r="4" fill="#fbcfe8" />

        {/* Head with subtle tilt back when drinking */}
        <g className="water-animated-head">
          <rect x="146" y="87" width="8" height="12" rx="3" fill="#fbcfe8" />
          <circle cx="137" cy="74" r="3.5" fill="#fbcfe8" />
          <circle cx="163" cy="74" r="3.5" fill="#fbcfe8" />
          <rect x="139" y="60" width="22" height="26" rx="9" fill="#fbcfe8" />
          <path
            d="M 138 68 C 138 56 142 50 150 50 C 158 50 162 56 162 68 C 159 64 154 62 150 63 C 146 62 141 64 138 68 Z"
            fill="#1e293b"
          />
          <circle cx="145" cy="73" r="1.8" fill="#0f172a" />
          <circle cx="155" cy="73" r="1.8" fill="#0f172a" />
          <path d="M 148 80 Q 150 82 152 80" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>

        {/* ANIMATED RIGHT ARM & WATER GLASS (Lifting to mouth -> sipping -> lowering) */}
        <g className="water-animated-arm-glass">
          <path
            d="M 166 102 C 178 115 186 130 182 142"
            stroke="#0284c7"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="182" cy="142" r="5" fill="#fbcfe8" />
          <polygon points="178,132 192,132 190,148 180,148" fill="rgba(255,255,255,0.7)" stroke="#38bdf8" strokeWidth="1.2" />
          <polygon points="179,137 191,137 189,147 181,147" fill="#0284c7" opacity="0.8" />
        </g>

        {/* Refreshment sparkles */}
        <g className="water-sparkles">
          <circle cx="160" cy="55" r="2" fill="#38bdf8" />
          <circle cx="135" cy="50" r="1.5" fill="#2dd4bf" />
        </g>
      </svg>
    </div>
  );
};

/**
 * Animated SVG Illustration: Walking Break
 * Person taking a lively, refreshing stroll away from their workspace.
 * Features animated alternating leg strides, swinging arms, gentle torso bobbing,
 * walking path markings, distant trees/hallway greenery, and forward stride motion ripples.
 */
export const WalkingAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg
        viewBox="0 0 300 210"
        className="exercise-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="walkPathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="walkSweatshirt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="walkSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ecfdf5" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Ambient Floor Shadow under walker */}
        <ellipse cx="150" cy="198" rx="72" ry="7" fill="rgba(15, 23, 42, 0.07)" className="walk-shadow-bounce" />

        {/* Scenic Background: Soft park greenery & distant pathway */}
        <g opacity="0.6">
          {/* Distant trees on left */}
          <ellipse cx="36" cy="148" rx="22" ry="34" fill="#a7f3d0" />
          <ellipse cx="44" cy="132" rx="18" ry="26" fill="#6ee7b7" />
          <rect x="34" y="160" width="6" height="34" rx="2" fill="#64748b" opacity="0.5" />

          {/* Distant trees on right */}
          <ellipse cx="264" cy="144" rx="20" ry="32" fill="#a7f3d0" />
          <ellipse cx="256" cy="130" rx="16" ry="24" fill="#6ee7b7" />
          <rect x="261" y="156" width="6" height="38" rx="2" fill="#64748b" opacity="0.5" />

          {/* Sun / Refreshing Morning Glow */}
          <circle cx="230" cy="52" r="16" fill="#fef08a" opacity="0.75" />
        </g>

        {/* Walking Trail / Pathway with moving stride dashed lines */}
        <g>
          <line x1="20" y1="196" x2="280" y2="196" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
          <g className="walk-trail-lines">
            <line x1="60" y1="196" x2="110" y2="196" stroke="#059669" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            <line x1="190" y1="196" x2="240" y2="196" stroke="#059669" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          </g>
        </g>

        {/* Walking Direction Arrow Chevrons indicating forward motion */}
        <g className="walk-direction-arrows" opacity="0.75">
          <path d="M 195 160 L 208 170 L 195 180" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M 215 160 L 228 170 L 215 180" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>

        {/* ====================================================================
            ACTIVE WALKING PERSON (Profile/Three-Quarter walking stride)
           ==================================================================== */}
        <g className="walk-character-group">
          {/* BACK LEG (Right Leg - swings opposite to front) */}
          <g className="walk-leg-back">
            {/* Thigh & Calf */}
            <path d="M 152 142 L 140 168 L 130 192" stroke="#1e293b" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Sneaker */}
            <path d="M 124 194 C 124 190 134 189 144 192 L 142 196 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="124" y1="196" x2="144" y2="196" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* BACK ARM (Right Arm - swings opposite to back leg) */}
          <g className="walk-arm-back">
            <path d="M 154 102 L 168 122 L 176 138" stroke="#047857" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="178" cy="140" r="4" fill="#fbcfe8" />
          </g>

          {/* TORSO & PELVIS (Gentle vertical bounce) */}
          <g className="walk-torso-bounce">
            <path
              d="M 140 144 C 138 120 140 102 146 98 L 162 98 C 168 102 166 120 162 144 Z"
              fill="url(#walkSweatshirt)"
            />
            {/* Collar line */}
            <path d="M 147 98 Q 154 104 161 98" stroke="#047857" strokeWidth="2" fill="none" />

            {/* Neck */}
            <rect x="149" y="87" width="8" height="12" rx="3" fill="#fbcfe8" />

            {/* Head & Smiling Face */}
            <g>
              <circle cx="141" cy="74" r="3.5" fill="#fbcfe8" />
              <circle cx="167" cy="74" r="3.5" fill="#fbcfe8" />
              <rect x="143" y="60" width="22" height="26" rx="9" fill="#fbcfe8" />
              {/* Hair */}
              <path
                d="M 142 68 C 142 56 146 50 154 50 C 162 50 166 56 166 68 C 163 64 158 62 154 63 C 150 62 145 64 142 68 Z"
                fill="#1e293b"
              />
              {/* Walking Gaze & Bright Smile */}
              <circle cx="157" cy="72" r="2.2" fill="#0f172a" />
              <circle cx="149" cy="72" r="2.2" fill="#0f172a" />
              <path d="M 150 78 Q 154 82 158 78" stroke="#e11d48" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            </g>
          </g>

          {/* FRONT LEG (Left Leg - vigorous stride forward and back) */}
          <g className="walk-leg-front">
            {/* Thigh & Calf */}
            <path d="M 148 142 L 162 168 L 176 192" stroke="#334155" strokeWidth="11.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Sneaker with green athletic stripe */}
            <path d="M 170 194 C 170 189 180 188 190 191 L 188 196 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="170" y1="196" x2="190" y2="196" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="175" y1="192" x2="183" y2="192" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* FRONT ARM (Left Arm - natural forward counter-swing) */}
          <g className="walk-arm-front">
            <path d="M 144 102 L 132 122 L 122 138" stroke="url(#walkSweatshirt)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="120" cy="140" r="4.5" fill="#fbcfe8" />
          </g>
        </g>

        {/* Dynamic breeze / stroll sparkles */}
        <g className="walk-sparkles">
          <circle cx="185" cy="80" r="2" fill="#10b981" />
          <circle cx="210" cy="95" r="1.5" fill="#34d399" />
          <path d="M 95 105 Q 110 102 125 106" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
};

/**
 * Animated SVG Illustration: Stand & Stretch
 * Office worker standing up tall beside their desk and office chair,
 * extending arms overhead to decompress the spine, restore full circulation,
 * with upward pulsing arrows and revitalization glow.
 */
export const StandStretchAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg
        viewBox="0 0 300 210"
        className="exercise-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="standGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="standArrowGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Ambient Floor Shadow */}
        <ellipse cx="150" cy="198" rx="76" ry="6.5" fill="rgba(15, 23, 42, 0.07)" />

        {/* Office Chair pushed back slightly to the left */}
        <g opacity="0.55" transform="translate(-40, 6)">
          <rect x="122" y="148" width="46" height="9" rx="3" fill="#1e293b" />
          <rect x="142" y="115" width="7" height="35" rx="2" fill="#1e293b" />
          <rect x="126" y="80" width="38" height="48" rx="8" fill="#334155" />
          <path d="M 145 180 L 124 193 M 145 180 L 166 193 M 145 180 L 145 195" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
        </g>

        {/* Work Desk on the Right */}
        <g opacity="0.45" transform="translate(10, 0)">
          <rect x="210" y="132" width="60" height="3" rx="1.5" fill="#cbd5e1" />
          <line x1="220" y1="135" x2="220" y2="195" stroke="#cbd5e1" strokeWidth="2.5" />
          <line x1="260" y1="135" x2="260" y2="195" stroke="#cbd5e1" strokeWidth="2.5" />
          <rect x="228" y="116" width="22" height="15" rx="2" fill="#94a3b8" />
        </g>

        {/* Upward Pulse Arrows on Left & Right of Character */}
        <g className="stand-arrows-left">
          <path d="M 105 130 L 105 75 M 98 85 L 105 74 L 112 85" stroke="url(#standArrowGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
        <g className="stand-arrows-right">
          <path d="M 195 130 L 195 75 M 188 85 L 195 74 L 202 85" stroke="url(#standArrowGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>

        {/* Standing Legs (Straight upright standing pose, feet grounded) */}
        <g>
          {/* Left leg */}
          <line x1="142" y1="132" x2="138" y2="190" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
          {/* Right leg */}
          <line x1="158" y1="132" x2="162" y2="190" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
          {/* Left shoe */}
          <path d="M 126 194 C 126 189 136 188 144 191 L 143 196 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="126" y1="196" x2="144" y2="196" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          {/* Right shoe */}
          <path d="M 156 194 C 156 189 166 188 174 191 L 173 196 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="156" y1="196" x2="174" y2="196" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* ANIMATED STANDING TORSO & OVERHEAD ARMS (Lengthening, expanding chest, reaching upward) */}
        <g className="stand-animated-upper-body">
          {/* Torso */}
          <path
            d="M 136 134 C 136 108 138 94 144 90 L 156 90 C 162 94 164 108 164 134 Z"
            fill="url(#standGrad)"
          />

          {/* Neck */}
          <rect x="146" y="79" width="8" height="12" rx="3" fill="#fbcfe8" />

          {/* Head looking slightly upward */}
          <g>
            <circle cx="137" cy="68" r="3.5" fill="#fbcfe8" />
            <circle cx="163" cy="68" r="3.5" fill="#fbcfe8" />
            <rect x="139" y="54" width="22" height="26" rx="9" fill="#fbcfe8" />
            <path
              d="M 138 62 C 138 50 142 44 150 44 C 158 44 162 50 162 62 C 159 58 154 56 150 57 C 146 56 141 58 138 62 Z"
              fill="#1e293b"
            />
            {/* Contented upward smile & peaceful eyes */}
            <path d="M 143 66 Q 146 64 149 66" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 151 66 Q 154 64 157 66" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 147 72 Q 150 76 153 72" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>

          {/* Overhead Reaching Arms */}
          <g className="stand-overhead-arms">
            {/* Left Arm reaching overhead */}
            <path
              d="M 140 94 C 130 78 132 50 146 32"
              stroke="url(#standGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right Arm reaching overhead */}
            <path
              d="M 160 94 C 170 78 168 50 154 32"
              stroke="url(#standGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            {/* Interlaced / touching hands at peak */}
            <ellipse cx="150" cy="30" rx="8" ry="5" fill="#fbcfe8" />
          </g>
        </g>

        {/* Upward Energy / Circulation sparkles at top */}
        <g className="stand-sparkles">
          <circle cx="150" cy="18" r="2.5" fill="#38bdf8" />
          <circle cx="132" cy="24" r="1.8" fill="#2dd4bf" />
          <circle cx="168" cy="24" r="1.8" fill="#2dd4bf" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 1. EYE BREAK VARIATIONS
 */

/** Eye Break Variation 1: Window View (Alias of EyeBreakAnimation) */
export const EyeBreakWindowAnimation: React.FC = () => <EyeBreakAnimation />;

/** Eye Break Variation 2: Room Distance Focus */
export const EyeBreakRoomAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg viewBox="0 0 300 210" className="exercise-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="roomBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0fdf4" />
            <stop offset="100%" stopColor="#ecfdf5" />
          </linearGradient>
          <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>

        {/* Floor Shadow */}
        <ellipse cx="140" cy="196" rx="75" ry="6" fill="rgba(15, 23, 42, 0.06)" />

        {/* Room Background Elements: Far Wall Picture & Clock */}
        <g opacity="0.85">
          {/* Framed Wall Art on Left */}
          <rect x="25" y="45" width="42" height="32" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M 30 70 L 42 55 L 52 65 L 60 58 L 62 70 Z" fill="#99f6e4" />
          <circle cx="54" cy="52" r="3" fill="#fbbf24" />

          {/* Wall Clock on Far Right (Focal Point across room) */}
          <circle cx="255" cy="55" r="22" fill="#ffffff" stroke="#0d9488" strokeWidth="2.5" />
          <circle cx="255" cy="55" r="2.5" fill="#0f766e" />
          <line x1="255" y1="55" x2="255" y2="42" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />
          <line x1="255" y1="55" x2="265" y2="55" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" />
          {/* Subtle pulse ring around clock */}
          <circle cx="255" cy="55" r="28" fill="none" stroke="#14b8a6" strokeWidth="1.2" opacity="0.4" className="clock-focal-pulse" />
        </g>

        {/* Desk and Laptop (Foreground Left/Center) */}
        <g opacity="0.5">
          <rect x="75" y="148" width="65" height="4" rx="2" fill="#94a3b8" />
          <rect x="88" y="130" width="28" height="18" rx="2" fill="#cbd5e1" />
          <line x1="84" y1="148" x2="120" y2="148" stroke="#64748b" strokeWidth="2" />
        </g>

        {/* Active Character Gazing Across Room */}
        <g className="eye-room-character">
          {/* Seated Torso */}
          <path d="M 130 185 L 126 150 C 126 122 130 108 140 104 L 160 104 C 170 108 174 122 174 150 L 170 185 Z" fill="#0d9488" />
          <rect x="146" y="92" width="8" height="14" rx="3" fill="#fbcfe8" />

          {/* Head & Tracking Eyes */}
          <g className="eye-room-head">
            <rect x="138" y="64" width="24" height="30" rx="10" fill="#fbcfe8" />
            <circle cx="136" cy="78" r="3.5" fill="#fbcfe8" />
            <circle cx="164" cy="78" r="3.5" fill="#fbcfe8" />
            {/* Hair */}
            <path d="M 137 72 C 137 58 142 52 150 52 C 158 52 163 58 163 72 C 160 67 155 65 150 66 C 145 65 140 67 137 72 Z" fill="#1e293b" />
            {/* Eye Sockets */}
            <ellipse cx="144" cy="76" rx="4" ry="4" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" />
            <ellipse cx="156" cy="76" rx="4" ry="4" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" />
            {/* Pupils Tracking Right toward Wall Clock */}
            <circle cx="145.5" cy="75.5" r="2.2" fill="#0f172a" className="eye-room-pupil" />
            <circle cx="157.5" cy="75.5" r="2.2" fill="#0f172a" className="eye-room-pupil" />
            <path d="M 147 84 Q 150 87 153 84" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>
        </g>

        {/* Dotted Sightline Ray to Clock */}
        <line
          x1="162"
          y1="75"
          x2="235"
          y2="57"
          stroke="#0d9488"
          strokeWidth="2"
          strokeDasharray="4,4"
          strokeLinecap="round"
          className="eye-room-sightline"
        />

        {/* Target Focal Badge */}
        <g transform="translate(230, 88)">
          <rect x="0" y="0" width="50" height="18" rx="9" fill="#ccfbf1" stroke="#14b8a6" strokeWidth="1" />
          <text x="25" y="12" textAnchor="middle" fill="#0f766e" fontSize="9" fontWeight="700">6m View</text>
        </g>
      </svg>
    </div>
  );
};

/** Eye Break Variation 3: Soft Gaze & Eye Rest (Palming / Decompression) */
export const EyeBreakRelaxAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg viewBox="0 0 300 210" className="exercise-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#14b8a6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Warm Relaxation Aura */}
        <circle cx="150" cy="85" r="68" fill="url(#auraGlow)" className="eye-relax-glow" />

        {/* Expanding Radiant Relaxation Wave Rings */}
        <circle cx="150" cy="85" r="38" fill="none" stroke="#2dd4bf" strokeWidth="1.5" className="eye-relax-wave wave-1" />
        <circle cx="150" cy="85" r="54" fill="none" stroke="#14b8a6" strokeWidth="1.2" className="eye-relax-wave wave-2" />

        {/* Floor Shadow */}
        <ellipse cx="150" cy="195" rx="70" ry="5" fill="rgba(15, 23, 42, 0.06)" />

        {/* Seated Relaxed Character */}
        <g className="eye-relax-character">
          <path d="M 132 188 C 130 152 134 116 142 110 L 158 110 C 166 116 170 152 168 188 Z" fill="#0d9488" />
          <rect x="146" y="98" width="8" height="14" rx="3" fill="#fbcfe8" />

          {/* Gently Tilted Relaxed Head */}
          <g>
            <rect x="138" y="70" width="24" height="30" rx="10" fill="#fbcfe8" />
            <circle cx="136" cy="84" r="3.5" fill="#fbcfe8" />
            <circle cx="164" cy="84" r="3.5" fill="#fbcfe8" />
            <path d="M 137 78 C 137 64 142 58 150 58 C 158 58 163 64 163 78 C 160 73 155 71 150 72 C 145 71 140 73 137 78 Z" fill="#1e293b" />
            {/* Soft closed crescent eyes */}
            <path d="M 142 83 Q 146 86 149 83" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 151 83 Q 154 86 158 83" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Peaceful gentle smile */}
            <path d="M 147 91 Q 150 94 153 91" stroke="#e11d48" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>

          {/* Relaxed Hands resting at heart/collar */}
          <ellipse cx="144" cy="120" rx="7" ry="5" fill="#fbcfe8" />
          <ellipse cx="156" cy="120" rx="7" ry="5" fill="#fbcfe8" />
        </g>

        {/* Soft soothing sparkles */}
        <g className="eye-relax-sparkles">
          <circle cx="118" cy="72" r="2" fill="#38bdf8" />
          <circle cx="182" cy="72" r="2" fill="#38bdf8" />
          <circle cx="150" cy="46" r="2.5" fill="#34d399" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 2. POSTURE & NECK VARIATIONS
 */

/** Posture Variation 1: Gentle Neck Side Stretch (Alias/enhancement of NeckShoulderAnimation) */
export const NeckSideStretchAnimation: React.FC = () => <NeckShoulderAnimation />;

/** Posture Variation 2: Shoulder Rolls & Scapular Release */
export const ShoulderRollsAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg viewBox="0 0 300 210" className="exercise-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="shoulderSweatshirt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>

        {/* Floor Shadow */}
        <ellipse cx="150" cy="195" rx="72" ry="5" fill="rgba(15, 23, 42, 0.06)" />

        {/* Circular Orbit Guide Arrows for Shoulders */}
        <g className="shoulder-orbit-guides" opacity="0.85">
          {/* Left Shoulder Circular Arc Arrow */}
          <path d="M 124 100 A 14 14 0 1 1 124 122" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeDasharray="3,3" />
          <polygon points="122,126 128,122 122,118" fill="#0d9488" />

          {/* Right Shoulder Circular Arc Arrow */}
          <path d="M 176 100 A 14 14 0 1 0 176 122" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeDasharray="3,3" />
          <polygon points="178,126 172,122 178,118" fill="#0d9488" />
        </g>

        {/* Character with Actively Rolling Shoulders */}
        <g className="shoulder-rolls-character">
          {/* Torso */}
          <path d="M 132 185 C 130 145 134 114 142 108 L 158 108 C 166 114 170 145 168 185 Z" fill="url(#shoulderSweatshirt)" />
          <rect x="146" y="96" width="8" height="14" rx="3" fill="#fbcfe8" />

          {/* Head looking straight & tall */}
          <g>
            <rect x="138" y="68" width="24" height="30" rx="10" fill="#fbcfe8" />
            <circle cx="136" cy="82" r="3.5" fill="#fbcfe8" />
            <circle cx="164" cy="82" r="3.5" fill="#fbcfe8" />
            <path d="M 137 76 C 137 62 142 56 150 56 C 158 56 163 62 163 76 C 160 71 155 69 150 70 C 145 69 140 71 137 76 Z" fill="#1e293b" />
            <path d="M 143 81 Q 146 84 149 81" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 151 81 Q 154 84 157 81" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 147 88 Q 150 92 153 88" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>

          {/* Rolling Shoulders with dynamic transform */}
          <g className="shoulder-joint-left">
            <circle cx="126" cy="112" r="8" fill="#14b8a6" />
          </g>
          <g className="shoulder-joint-right">
            <circle cx="174" cy="112" r="8" fill="#14b8a6" />
          </g>
        </g>

        {/* Release / Expansion Energy Burst */}
        <g className="shoulder-sparkles">
          <circle cx="108" cy="108" r="2.2" fill="#38bdf8" />
          <circle cx="192" cy="108" r="2.2" fill="#38bdf8" />
        </g>
      </svg>
    </div>
  );
};

/** Posture Variation 3: Seated Posture Reset */
export const PostureResetAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg viewBox="0 0 300 210" className="exercise-svg" xmlns="http://www.w3.org/2000/svg">
        {/* Floor Shadow */}
        <ellipse cx="150" cy="195" rx="75" ry="5" fill="rgba(15, 23, 42, 0.06)" />

        {/* Ergonomic Chair */}
        <g opacity="0.6">
          <line x1="150" y1="175" x2="150" y2="195" stroke="#334155" strokeWidth="4" />
          <rect x="122" y="152" width="56" height="8" rx="3" fill="#1e293b" />
          {/* Chair Back Support */}
          <rect x="120" y="85" width="8" height="65" rx="4" fill="#334155" />
        </g>

        {/* Glowing Neutral Spine Alignment Beam */}
        <line x1="150" y1="70" x2="150" y2="155" stroke="#10b981" strokeWidth="3" strokeDasharray="5,4" className="posture-spine-beam" />

        {/* Character demonstrating un-slumping to upright spine */}
        <g className="posture-reset-body">
          {/* Torso transitioning to elongated spine */}
          <path d="M 132 155 C 132 120 136 98 144 94 L 156 94 C 164 98 168 120 168 155 Z" fill="#0d9488" />
          <rect x="146" y="82" width="8" height="14" rx="3" fill="#fbcfe8" />

          {/* Chin Tucked Neutral Head */}
          <g>
            <rect x="138" y="56" width="24" height="28" rx="9" fill="#fbcfe8" />
            <circle cx="136" cy="70" r="3.5" fill="#fbcfe8" />
            <circle cx="164" cy="70" r="3.5" fill="#fbcfe8" />
            <path d="M 137 64 C 137 50 142 45 150 45 C 158 45 163 50 163 64 C 160 60 155 58 150 59 C 145 58 140 60 137 64 Z" fill="#1e293b" />
            <path d="M 143 69 Q 146 72 149 69" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 151 69 Q 154 72 157 69" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 147 76 Q 150 79 153 76" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>

          {/* Relaxed Hands resting on lap */}
          <ellipse cx="140" cy="148" rx="6" ry="4" fill="#fbcfe8" />
          <ellipse cx="160" cy="148" rx="6" ry="4" fill="#fbcfe8" />
        </g>

        {/* Alignment Checkmark Badge */}
        <g transform="translate(198, 70)">
          <circle cx="10" cy="10" r="10" fill="#d1fae5" stroke="#10b981" strokeWidth="1.5" />
          <path d="M 6 10 L 9 13 L 14 7" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 3. STAND & STRETCH VARIATIONS
 */

/** Stand Variation 1: Standing Overhead Stretch (Alias of StandStretchAnimation) */
export const StandOverheadAnimation: React.FC = () => <StandStretchAnimation />;

/** Stand Variation 2: Gentle Left-Right Side Stretch */
export const StandSideStretchAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg viewBox="0 0 300 210" className="exercise-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sideStretchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Floor Shadow */}
        <ellipse cx="150" cy="198" rx="70" ry="5" fill="rgba(15, 23, 42, 0.06)" />

        {/* Lateral Flank Stretch Guide Arcs */}
        <g opacity="0.6">
          <path d="M 115 65 Q 98 105 125 155" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="3,3" />
          <path d="M 185 65 Q 202 105 175 155" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="3,3" />
        </g>

        {/* Standing Legs with Stable Stance */}
        <g>
          <line x1="140" y1="140" x2="132" y2="195" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
          <line x1="160" y1="140" x2="168" y2="195" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
          {/* Shoes */}
          <ellipse cx="128" cy="196" rx="8" ry="3" fill="#0f172a" />
          <ellipse cx="172" cy="196" rx="8" ry="3" fill="#0f172a" />
        </g>

        {/* Animated Lateral Bending Torso */}
        <g className="stand-side-sway">
          {/* Torso */}
          <path d="M 136 142 C 136 112 138 96 144 92 L 156 92 C 162 96 164 112 164 142 Z" fill="url(#sideStretchGrad)" />
          <rect x="146" y="80" width="8" height="14" rx="3" fill="#fbcfe8" />

          {/* Head */}
          <g>
            <rect x="138" y="56" width="24" height="26" rx="9" fill="#fbcfe8" />
            <circle cx="136" cy="70" r="3.5" fill="#fbcfe8" />
            <circle cx="164" cy="70" r="3.5" fill="#fbcfe8" />
            <path d="M 137 64 C 137 52 142 46 150 46 C 158 46 163 52 163 64 Z" fill="#1e293b" />
            <path d="M 143 69 Q 146 72 149 69" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 151 69 Q 154 72 157 69" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>

          {/* Overhead Arching Arm */}
          <path d="M 162 94 C 176 72 168 40 134 32" stroke="url(#sideStretchGrad)" strokeWidth="8" strokeLinecap="round" fill="none" />
          <circle cx="132" cy="32" r="4.5" fill="#fbcfe8" />

          {/* Opposite Arm resting on hip */}
          <path d="M 136 94 C 126 104 124 118 132 124" stroke="url(#sideStretchGrad)" strokeWidth="8" strokeLinecap="round" fill="none" />
          <circle cx="134" cy="124" r="4.5" fill="#fbcfe8" />
        </g>
      </svg>
    </div>
  );
};

/** Stand Variation 3: Standing Shoulder & Upper-Back Chest Opener */
export const StandChestOpenerAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg viewBox="0 0 300 210" className="exercise-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="chestOpenerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>

        {/* Floor Shadow */}
        <ellipse cx="150" cy="196" rx="65" ry="5" fill="rgba(15, 23, 42, 0.06)" />

        {/* Expanding Breathing Arc Rings from Chest */}
        <g className="chest-expansion-waves" opacity="0.75">
          <path d="M 160 85 A 25 25 0 0 1 160 125" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeDasharray="3,3" />
          <path d="M 168 75 A 35 35 0 0 1 168 135" fill="none" stroke="#14b8a6" strokeWidth="1.8" strokeDasharray="4,4" />
        </g>

        {/* Stable Standing Lower Body */}
        <g>
          <line x1="142" y1="135" x2="136" y2="194" stroke="#1e293b" strokeWidth="9" strokeLinecap="round" />
          <line x1="158" y1="135" x2="164" y2="194" stroke="#1e293b" strokeWidth="9" strokeLinecap="round" />
          <ellipse cx="132" cy="195" rx="7" ry="3" fill="#0f172a" />
          <ellipse cx="168" cy="195" rx="7" ry="3" fill="#0f172a" />
        </g>

        {/* Upper Body with Clasped Hands Behind Back & Opened Chest */}
        <g className="stand-chest-expand">
          {/* Proud Expanded Torso */}
          <path d="M 136 136 C 136 104 138 90 144 86 L 158 86 C 168 90 172 104 168 136 Z" fill="url(#chestOpenerGrad)" />
          <rect x="146" y="74" width="8" height="14" rx="3" fill="#fbcfe8" />

          {/* Head looking slightly lifted */}
          <g>
            <rect x="138" y="48" width="24" height="28" rx="9" fill="#fbcfe8" />
            <circle cx="136" cy="62" r="3.5" fill="#fbcfe8" />
            <circle cx="164" cy="62" r="3.5" fill="#fbcfe8" />
            <path d="M 137 56 C 137 42 142 38 150 38 C 158 38 163 42 163 56 Z" fill="#1e293b" />
            <path d="M 143 61 Q 146 59 149 61" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 151 61 Q 154 59 157 61" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 147 67 Q 150 71 153 67" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>

          {/* Hands Clasped Behind Lower Back */}
          <path d="M 136 92 C 122 105 120 125 138 128" stroke="url(#chestOpenerGrad)" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M 164 92 C 172 105 168 125 142 128" stroke="url(#chestOpenerGrad)" strokeWidth="8" strokeLinecap="round" fill="none" />
          <ellipse cx="140" cy="128" rx="6" ry="4" fill="#fbcfe8" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 4. WALKING REFRESH VARIATIONS
 */

/** Walking Variation 1: Step Away from Desk (Alias of WalkingAnimation) */
export const WalkDeskAnimation: React.FC = () => <WalkingAnimation />;

/** Walking Variation 2: Short Indoor Stroll */
export const WalkStrollAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg viewBox="0 0 300 210" className="exercise-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="strollPants" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>

        {/* Ambient Indoor Hallway & Corridor Wall / Plant */}
        <g opacity="0.7">
          {/* Corridor Arch / Door Frame */}
          <rect x="22" y="40" width="46" height="155" fill="none" stroke="#e2e8f0" strokeWidth="2.5" rx="3" />
          {/* Indoor Potted Palm */}
          <polygon points="40,195 56,195 59,165 37,165" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
          <path d="M 48 165 C 38 145 28 135 32 120 C 40 128 46 148 48 165 Z" fill="#10b981" />
          <path d="M 48 165 C 56 142 68 132 70 115 C 60 125 54 148 48 165 Z" fill="#059669" />
        </g>

        {/* Floor Walking Path / Rhythm Dashes */}
        <g className="walk-trail-lines">
          <line x1="85" y1="196" x2="105" y2="196" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="125" y1="196" x2="155" y2="196" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="175" y1="196" x2="205" y2="196" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="225" y1="196" x2="245" y2="196" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Walking Figure in Smooth Stride Cadence */}
        <g className="walk-torso-bounce">
          {/* Legs */}
          <line x1="148" y1="142" x2="132" y2="190" stroke="url(#strollPants)" strokeWidth="10" strokeLinecap="round" className="walk-leg-front" />
          <line x1="152" y1="142" x2="168" y2="190" stroke="url(#strollPants)" strokeWidth="10" strokeLinecap="round" className="walk-leg-back" />
          {/* Shoes */}
          <ellipse cx="128" cy="192" rx="7" ry="3.5" fill="#0f172a" />
          <ellipse cx="172" cy="192" rx="7" ry="3.5" fill="#0f172a" />

          {/* Torso */}
          <path d="M 138 144 L 140 102 L 160 102 L 162 144 Z" fill="#0d9488" />
          <rect x="146" y="90" width="8" height="14" rx="3" fill="#fbcfe8" />

          {/* Relaxed Swinging Arms */}
          <line x1="144" y1="106" x2="130" y2="138" stroke="#0d9488" strokeWidth="7" strokeLinecap="round" className="walk-arm-front" />
          <circle cx="128" cy="140" r="4" fill="#fbcfe8" />
          <line x1="156" y1="106" x2="170" y2="138" stroke="#0f766e" strokeWidth="7" strokeLinecap="round" className="walk-arm-back" />
          <circle cx="172" cy="140" r="4" fill="#fbcfe8" />

          {/* Head looking forward & relaxed */}
          <g>
            <rect x="138" y="66" width="24" height="26" rx="9" fill="#fbcfe8" />
            <circle cx="136" cy="80" r="3.5" fill="#fbcfe8" />
            <circle cx="164" cy="80" r="3.5" fill="#fbcfe8" />
            <path d="M 137 74 C 137 60 142 54 150 54 C 158 54 163 60 163 74 Z" fill="#1e293b" />
            <circle cx="152" cy="78" r="2" fill="#0f172a" />
            <path d="M 148 84 Q 152 87 155 84" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  );
};

/** Walking Variation 3: Walk Away and Gaze at Horizon */
export const WalkDistantGazeAnimation: React.FC = () => {
  return (
    <div className="animation-container">
      <svg viewBox="0 0 300 210" className="exercise-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="horizonSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>
          <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#bfdbfe" />
          </linearGradient>
        </defs>

        {/* Scenic Panoramic Window (Right side) */}
        <g>
          {/* Window Frame */}
          <rect x="160" y="32" width="125" height="150" rx="6" fill="url(#horizonSky)" stroke="#94a3b8" strokeWidth="2.5" />
          {/* Distant Mountains on Horizon */}
          <polygon points="160,140 195,95 230,135 255,108 285,150 160,150" fill="url(#mountainGrad)" />
          {/* Distant Sun / Glow */}
          <circle cx="215" cy="75" r="14" fill="#fef08a" opacity="0.85" />
          {/* Window Pane Divider */}
          <line x1="222" y1="32" x2="222" y2="182" stroke="#cbd5e1" strokeWidth="1.5" />
        </g>

        {/* Floor Line */}
        <line x1="20" y1="195" x2="280" y2="195" stroke="#cbd5e1" strokeWidth="1.5" />

        {/* Walking Figure Stepping Toward Window and Gazing Outside */}
        <g className="walk-torso-bounce">
          {/* Walking Legs */}
          <line x1="108" y1="142" x2="94" y2="190" stroke="#334155" strokeWidth="10" strokeLinecap="round" className="walk-leg-front" />
          <line x1="114" y1="142" x2="132" y2="190" stroke="#334155" strokeWidth="10" strokeLinecap="round" className="walk-leg-back" />
          <ellipse cx="90" cy="192" rx="7" ry="3.5" fill="#0f172a" />
          <ellipse cx="136" cy="192" rx="7" ry="3.5" fill="#0f172a" />

          {/* Torso */}
          <path d="M 100 144 L 102 102 L 122 102 L 124 144 Z" fill="#0d9488" />
          <rect x="108" y="90" width="8" height="14" rx="3" fill="#fbcfe8" />

          {/* Swinging Arms */}
          <line x1="104" y1="106" x2="90" y2="138" stroke="#0d9488" strokeWidth="7" strokeLinecap="round" className="walk-arm-front" />
          <circle cx="88" cy="140" r="4" fill="#fbcfe8" />
          <line x1="118" y1="106" x2="132" y2="138" stroke="#0f766e" strokeWidth="7" strokeLinecap="round" className="walk-arm-back" />
          <circle cx="134" cy="140" r="4" fill="#fbcfe8" />

          {/* Head Looking Up and Forward toward Window */}
          <g>
            <rect x="100" y="66" width="24" height="26" rx="9" fill="#fbcfe8" />
            <circle cx="98" cy="80" r="3.5" fill="#fbcfe8" />
            <circle cx="126" cy="80" r="3.5" fill="#fbcfe8" />
            <path d="M 99 74 C 99 60 104 54 112 54 C 120 54 125 60 125 74 Z" fill="#1e293b" />
            {/* Gaze pupil looking right toward horizon */}
            <circle cx="118" cy="76" r="2.2" fill="#0f172a" />
            <path d="M 110 84 Q 114 87 118 84" stroke="#e11d48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </g>
        </g>

        {/* Horizon Gaze Ray to Window */}
        <line x1="126" y1="76" x2="185" y2="76" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.75" />
      </svg>
    </div>
  );
};

/**
 * Universal Exercise Animation Resolver
 * Maps any exercise variation key or reminder type to its dedicated animated component.
 */
export function getExerciseAnimation(illustrationKey?: string, type?: string): React.ReactElement {
  switch (illustrationKey) {
    case 'eye-window':
    case 'eye-distance':
      return <EyeBreakAnimation />;
    case 'eye-room':
      return <EyeBreakRoomAnimation />;
    case 'eye-relax':
    case 'eye-palming':
      return <EyeBreakRelaxAnimation />;

    case 'neck-tilt':
    case 'posture-neck-stretch':
    case 'neck-shoulder':
      return <NeckShoulderAnimation />;
    case 'shoulder-roll':
    case 'shoulder-rolls':
    case 'posture-shoulder-rolls':
      return <ShoulderRollsAnimation />;
    case 'posture-reset':
      return <PostureResetAnimation />;

    case 'stand-overhead':
    case 'stand-reset':
      return <StandStretchAnimation />;
    case 'stand-side-stretch':
      return <StandSideStretchAnimation />;
    case 'stand-chest-opener':
      return <StandChestOpenerAnimation />;

    case 'walking-break':
    case 'walk-desk':
      return <WalkingAnimation />;
    case 'walk-stroll':
      return <WalkStrollAnimation />;
    case 'walk-distant-gaze':
      return <WalkDistantGazeAnimation />;

    default:
      if (type === 'walking') return <WalkingAnimation />;
      if (type === 'stand-move') return <StandStretchAnimation />;
      if (type === 'eye-break') return <EyeBreakAnimation />;
      if (type === 'neck-shoulder') return <NeckShoulderAnimation />;
      if (type === 'water') return <WaterReminderAnimation />;
      return <StretchBreakAnimation />;
  }
}

