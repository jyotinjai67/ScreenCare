import React from 'react';
import '../styles/scenes.css';

/**
 * ScreenCare animated exercise scenes.
 *
 * Designed to senior motion design & character illustration standards:
 * - One cohesive, anatomically proportioned character system across all 12 scenes.
 * - Premium wellness aesthetic: restrained teal/mint pullover, slate pants, white sneakers, warm skin tones.
 * - Organic, fluid joint motion with natural easing curves and seamless looping.
 * - Clean silhouettes, generous negative space, zero visual clutter or distracting in-illustration labels.
 * - Scaled to fill the desktop notification viewport with clarity and impact.
 */

const P = {
  skin: '#F6C9A8',
  skinD: '#E2A784',
  skinH: '#FDE68A',
  blush: '#FB7185',
  hair: '#1E293B',
  shirt: '#14B8A6',
  shirtD: '#0D9488',
  shirtDarker: '#0F766E',
  pants: '#1E293B',
  pantsD: '#0F172A',
  shoe: '#FFFFFF',
  shoeSole: '#CBD5E1',
  shoeLine: '#0F172A',
  ink: '#0F172A',
  chair: '#334155',
  chairMesh: '#475569',
  chairD: '#1E293B',
  stem: '#64748B',
  desk: '#E2E8F0',
  deskD: '#CBD5E1',
  screen: '#38BDF8',
  accent: '#F59E0B',
  guide: '#0D9488',
  guideMint: '#5EEAD4',
};

export interface SceneDef {
  key: string;
  label: string;
  durationSec: number;
  phases: string[];
  render: () => React.ReactElement;
}

const o = (x: number, y: number): React.CSSProperties => ({ transformOrigin: `${x}px ${y}px` });

/* ------------------------------------------------------------------------------------------------ */
/* Shared Illustration Elements & Gradients                                                         */
/* ------------------------------------------------------------------------------------------------ */

const Backdrop: React.FC<{ id: string; top: string; bottom: string; floor?: string }> = ({
  id,
  top,
  bottom,
  floor = '#E2E8F0',
}) => (
  <g>
    <defs>
      <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="100%" stopColor={bottom} />
      </linearGradient>
    </defs>
    <rect x={0} y={0} width={240} height={180} rx={14} fill={`url(#${id}-bg)`} />
    <rect x={0} y={163} width={240} height={17} fill={floor} opacity={0.45} />
  </g>
);

const Desk: React.FC<{ x: number; y: number; w: number }> = ({ x, y, w }) => (
  <g>
    <rect x={x} y={y} width={w} height={5} rx={2.5} fill={P.desk} />
    <rect x={x + 6} y={y + 5} width={3.5} height={160 - y - 4} fill={P.deskD} opacity={0.7} />
    <rect x={x + w - 9} y={y + 5} width={3.5} height={160 - y - 4} fill={P.deskD} opacity={0.7} />
  </g>
);

const Monitor: React.FC<{ x: number; y: number; w?: number }> = ({ x, y, w = 46 }) => (
  <g opacity={0.92}>
    <rect x={x} y={y} width={w} height={w * 0.65} rx={3.5} fill="#1E293B" />
    <rect x={x + 2.5} y={y + 2.5} width={w - 5} height={w * 0.65 - 5} rx={2} fill={P.screen} opacity={0.8} />
    <rect x={x + 6} y={y + 7} width={w * 0.45} height={2.5} rx={1.2} fill="#ffffff" opacity={0.7} />
    <rect x={x + 6} y={y + 12} width={w * 0.28} height={2.5} rx={1.2} fill="#ffffff" opacity={0.5} />
    <rect x={x + w / 2 - 2} y={y + w * 0.65} width={4} height={7} fill="#334155" />
    <rect x={x + w / 2 - 9} y={y + w * 0.65 + 6} width={18} height={2.5} rx={1.2} fill="#334155" />
  </g>
);

const Plant: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <ellipse cx={0} cy={0} rx={10} ry={2.5} fill="#0F172A" opacity={0.06} />
    {/* Ceramic pot */}
    <path d="M-7,0 h14 l-2,13 h-10 z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth={1} />
    {/* Monstera / Ficus foliage */}
    <path d="M0,0 C-9,-10 -11,-24 -3,-31 C-1,-20 2,-12 0,0Z" fill="#34D399" />
    <path d="M0,0 C8,-9 12,-22 7,-31 C2,-20 -1,-12 0,0Z" fill="#10B981" />
    <path d="M0,0 C-2,-12 1,-27 3,-36 C6,-25 4,-12 0,0Z" fill="#059669" />
  </g>
);

/* ------------------------------------------------------------------------------------------------ */
/* Master Character Rig: Front View                                                                 */
/* ------------------------------------------------------------------------------------------------ */

const FrontHead: React.FC<{ cx: number; cy: number; mood?: 'smile' | 'calm' }> = ({ cx, cy, mood = 'smile' }) => (
  <g>
    {/* Delicate ear curves */}
    <circle cx={cx - 13.5} cy={cy + 1} r={3} fill={P.skinD} />
    <circle cx={cx + 13.5} cy={cy + 1} r={3} fill={P.skinD} />

    {/* Anatomical head contour */}
    <path
      d={`M${cx - 13},${cy - 2} C${cx - 13.5},${cy + 10} ${cx - 7},${cy + 16} ${cx},${cy + 16} C${cx + 7},${cy + 16} ${cx + 13.5},${cy + 10} ${cx + 13},${cy - 2} C${cx + 13},${cy - 14} ${cx - 13},${cy - 14} ${cx - 13},${cy - 2} Z`}
      fill={P.skin}
    />

    {/* Modern swept hairstyle */}
    <path
      d={`M${cx - 14},${cy - 1} C${cx - 15},${cy - 16} ${cx + 15},${cy - 17} ${cx + 14},${cy - 1} C${cx + 10},${cy - 8} ${cx + 3},${cy - 10} ${cx - 3},${cy - 8} C${cx - 8},${cy - 6.5} ${cx - 12},${cy - 4} ${cx - 14},${cy - 1} Z`}
      fill={P.hair}
    />

    {/* Soft cheek warmth */}
    <circle cx={cx - 8} cy={cy + 5.5} r={2.8} fill={P.blush} opacity={0.25} />
    <circle cx={cx + 8} cy={cy + 5.5} r={2.8} fill={P.blush} opacity={0.25} />

    {/* Facial features */}
    <g className="face">
      {mood === 'smile' ? (
        <>
          <path d={`M${cx - 8},${cy + 1.5} q3,3 6,0`} stroke={P.ink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <path d={`M${cx + 2},${cy + 1.5} q3,3 6,0`} stroke={P.ink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <path d={`M${cx - 3.5},${cy + 8} q3.5,3 7,0`} stroke="#E11D48" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse className="eye" cx={cx - 5} cy={cy + 1.5} rx={1.8} ry={2.4} fill={P.ink} />
          <ellipse className="eye" cx={cx + 5} cy={cy + 1.5} rx={1.8} ry={2.4} fill={P.ink} />
          <circle cx={cx - 4.4} cy={cy + 0.8} r={0.6} fill="#ffffff" />
          <circle cx={cx + 5.6} cy={cy + 0.8} r={0.6} fill="#ffffff" />
          <path d={`M${cx - 3},${cy + 8} q3,1.8 6,0`} stroke={P.ink} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        </>
      )}
    </g>
  </g>
);

interface FrontFigureProps {
  seated?: boolean;
  x?: number;
  showChair?: boolean;
}

const FrontFigure: React.FC<FrontFigureProps> = ({ seated = false, x = 120, showChair = true }) => {
  const dy = seated ? 4 : 0;
  const hipY = 114 + dy;

  return (
    <g className="figure" transform={`translate(${x - 120},0)`}>
      {/* Soft ground contact shadow */}
      <ellipse cx={120} cy={165} rx={seated ? 38 : 30} ry={4.5} fill="#0F172A" opacity={0.07} />

      {/* Ergonomic task chair if seated */}
      {seated && showChair && (
        <g className="chair">
          <rect x={94} y={64 + dy} width={52} height={60} rx={12} fill="#334155" />
          <rect x={98} y={68 + dy} width={44} height={52} rx={9} fill="#475569" opacity={0.85} />
          <line x1={120} y1={124 + dy} x2={120} y2={152} stroke="#475569" strokeWidth={5} strokeLinecap="round" />
          <path d="M96,158 L120,152 L144,158" stroke="#1E293B" strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={96} cy={160.5} r={3} fill="#0F172A" />
          <circle cx={144} cy={160.5} r={3} fill="#0F172A" />
          <circle cx={120} cy={161} r={3} fill="#0F172A" />
        </g>
      )}

      {/* Lower body (legs & designer sneakers) */}
      {seated ? (
        <g>
          <rect x={90} y={116 + dy} width={60} height={10} rx={5} fill="#1E293B" />
          <g className="leg-l" style={o(110, 122 + dy)}>
            <path d={`M110,${122 + dy} L104,142 L103,158`} stroke={P.pants} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M94,158 h16 q3,0 3,3.5 v1.5 h-20 q0,-5 1,-5 z" fill={P.shoe} stroke={P.shoeSole} strokeWidth={1} />
            <line x1="93" y1="163" x2="114" y2="163" stroke={P.shoeLine} strokeWidth={1.5} />
          </g>
          <g className="leg-r" style={o(130, 122 + dy)}>
            <path d={`M130,${122 + dy} L136,142 L137,158`} stroke={P.pants} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M128,158 h16 q3,0 3,3.5 v1.5 h-20 q0,-5 1,-5 z" fill={P.shoe} stroke={P.shoeSole} strokeWidth={1} />
            <line x1="127" y1="163" x2="148" y2="163" stroke={P.shoeLine} strokeWidth={1.5} />
          </g>
        </g>
      ) : (
        <g>
          <g className="leg-l" style={o(111, 114)}>
            <line x1={111} y1={114} x2={109} y2={157} stroke={P.pants} strokeWidth={11} strokeLinecap="round" />
            <path d="M100,157 h16 q3,0 3,3.5 v1.5 h-20 q0,-5 1,-5 z" fill={P.shoe} stroke={P.shoeSole} strokeWidth={1} />
            <line x1="99" y1="162" x2="120" y2="162" stroke={P.shoeLine} strokeWidth={1.5} />
          </g>
          <g className="leg-r" style={o(129, 114)}>
            <line x1={129} y1={114} x2={131} y2={157} stroke={P.pants} strokeWidth={11} strokeLinecap="round" />
            <path d="M122,157 h16 q3,0 3,3.5 v1.5 h-20 q0,-5 1,-5 z" fill={P.shoe} stroke={P.shoeSole} strokeWidth={1} />
            <line x1="121" y1="162" x2="142" y2="162" stroke={P.shoeLine} strokeWidth={1.5} />
          </g>
        </g>
      )}

      {/* Torso, Arms & Head */}
      <g className="body" style={o(120, hipY)}>
        <g transform={`translate(0,${dy})`}>
          <rect x={105} y={106} width={30} height={12} rx={4} fill={P.pants} />

          {/* Teal Pullover Sweatshirt */}
          <path
            d="M102,77 Q102,66 112,65 L128,65 Q138,66 138,77 L135.5,111 L104.5,111 Z"
            fill={P.shirt}
          />
          <path d="M103,80 C103,98 105,108 105.5,111" stroke={P.shirtDarker} strokeWidth={2} fill="none" opacity={0.3} />
          <path d="M137,80 C137,98 135,108 134.5,111" stroke={P.shirtDarker} strokeWidth={2} fill="none" opacity={0.3} />

          {/* Left Arm Rig */}
          <g className="shoulder-l">
            <g className="arm-l" style={o(105, 72)}>
              <line x1={105} y1={72} x2={99} y2={96} stroke={P.shirt} strokeWidth={9.5} strokeLinecap="round" />
              <g className="fore-l" style={o(99, 96)}>
                <line x1={99} y1={96} x2={97} y2={117} stroke={P.skin} strokeWidth={7.5} strokeLinecap="round" />
                <circle cx={96.5} cy={120} r={4.5} fill={P.skin} />
              </g>
            </g>
            <circle cx={105} cy={72} r={6} fill={P.shirt} />
          </g>

          {/* Right Arm Rig */}
          <g className="shoulder-r">
            <g className="arm-r" style={o(135, 72)}>
              <line x1={135} y1={72} x2={141} y2={96} stroke={P.shirt} strokeWidth={9.5} strokeLinecap="round" />
              <g className="fore-r" style={o(141, 96)}>
                <line x1={141} y1={96} x2={143} y2={117} stroke={P.skin} strokeWidth={7.5} strokeLinecap="round" />
                <circle cx={143.5} cy={120} r={4.5} fill={P.skin} />
              </g>
            </g>
            <circle cx={135} cy={72} r={6} fill={P.shirt} />
          </g>

          {/* Neck & Crewneck collar */}
          <rect x={115.5} y={55} width={9} height={13} rx={3.5} fill={P.skin} />
          <path d="M113,67 Q120,73 127,67" stroke={P.shirtD} strokeWidth={2.4} fill="none" strokeLinecap="round" />

          {/* Head & Face */}
          <g className="head" style={o(120, 62)}>
            <FrontHead cx={120} cy={45} mood="smile" />
          </g>
        </g>
      </g>
    </g>
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* Master Character Rig: Side Profile View                                                          */
/* ------------------------------------------------------------------------------------------------ */

const SideHead: React.FC<{ cx: number; cy: number }> = ({ cx, cy }) => (
  <g>
    <circle cx={cx} cy={cy} r={14} fill={P.skin} />
    <path
      d={`M${cx - 14},${cy + 2} C${cx - 16},${cy - 17} ${cx + 10},${cy - 19} ${cx + 14},${cy - 4} C${cx + 7},${cy - 9} ${cx - 1},${cy - 9} ${cx - 4},${cy - 3} C${cx - 6},${cy + 1} ${cx - 9},${cy + 6} ${cx - 12},${cy + 7} Z`}
      fill={P.hair}
    />
    <circle cx={cx - 3.5} cy={cy + 1} r={3} fill={P.skinD} />
    <ellipse className="eye" cx={cx + 7} cy={cy - 0.5} rx={1.7} ry={2.2} fill={P.ink} />
    <circle cx={cx + 7.6} cy={cy - 1.2} r={0.6} fill="#ffffff" />
    <path d={`M${cx + 13.5},${cy + 1} q2.5,1.8 0,3.6`} stroke={P.skinD} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    <path d={`M${cx + 6.5},${cy + 7.5} q2.8,1.6 5.2,-0.2`} stroke="#E11D48" strokeWidth={1.3} fill="none" strokeLinecap="round" />
  </g>
);

const SideLeg: React.FC<{ x: number; y: number; cls: string; color: string }> = ({ x, y, cls, color }) => (
  <g className={`thigh-${cls}`} style={o(x, y)}>
    <line x1={x} y1={y} x2={x} y2={y + 25} stroke={color} strokeWidth={11} strokeLinecap="round" />
    <g className={`shin-${cls}`} style={o(x, y + 25)}>
      <line x1={x} y1={y + 25} x2={x} y2={y + 47} stroke={color} strokeWidth={9.5} strokeLinecap="round" />
      <path d={`M${x - 5},${y + 46} h12 q5.5,0 5.5,4.8 v1 h-18 z`} fill={P.shoe} stroke={P.shoeSole} strokeWidth={1} />
      <line x1={x - 5} y1={y + 51.8} x2={x + 13} y2={y + 51.8} stroke={P.shoeLine} strokeWidth={1.5} />
    </g>
  </g>
);

const SideArm: React.FC<{ x: number; y: number; cls: string; sleeve: string; skin: string }> = ({
  x,
  y,
  cls,
  sleeve,
  skin,
}) => (
  <g className={`arm-${cls}`} style={o(x, y)}>
    <line x1={x} y1={y} x2={x} y2={y + 22} stroke={sleeve} strokeWidth={9} strokeLinecap="round" />
    <g className={`fore-${cls}`} style={o(x, y + 22)}>
      <line x1={x} y1={y + 22} x2={x} y2={y + 40} stroke={skin} strokeWidth={7.5} strokeLinecap="round" />
      <circle cx={x} cy={y + 43} r={4.4} fill={skin} />
    </g>
  </g>
);

const SideFigure: React.FC<{ x?: number }> = ({ x = 120 }) => (
  <g className="figure" transform={`translate(${x - 120},0)`}>
    <ellipse className="shadow" cx={121} cy={165} rx={24} ry={4} fill="#0F172A" opacity={0.07} />
    <g className="walker">
      {/* Back leg */}
      <SideLeg x={121} y={108} cls="b" color={P.pantsD} />

      {/* Torso */}
      <g className="torso" style={o(121, 110)}>
        <SideArm x={121} y={70} cls="b" sleeve={P.shirtD} skin={P.skinD} />
        <rect x={110} y={101} width={21} height={14} rx={5} fill={P.pants} />
        <path d="M110,72 Q110,62 120,61.5 L124,61.5 Q133,62 133,72 L131.5,107 L111,107 Z" fill={P.shirt} />
        <rect x={117} y={52} width={8.5} height={12} rx={3} fill={P.skin} />
        <g className="head" style={o(122, 58)}>
          <SideHead cx={123} cy={42} />
        </g>
      </g>

      {/* Front leg */}
      <SideLeg x={121} y={108} cls="f" color={P.pants} />

      {/* Front arm */}
      <g className="torso-front" style={o(121, 110)}>
        <SideArm x={121} y={70} cls="f" sleeve={P.shirt} skin={P.skin} />
      </g>
    </g>
  </g>
);

/* ------------------------------------------------------------------------------------------------ */
/* 1. Eye Rest Scenes                                                                               */
/* ------------------------------------------------------------------------------------------------ */

const EyeWindowScene = () => (
  <>
    <Backdrop id="sew" top="#F0FDFA" bottom="#F8FAFC" />
    {/* Scenic window looking out to peaceful nature */}
    <g>
      <rect x={14} y={24} width={68} height={86} rx={7} fill="#E2E8F0" />
      <defs>
        <clipPath id="sew-clip">
          <rect x={17} y={27} width={62} height={80} rx={4} />
        </clipPath>
      </defs>
      <g clipPath="url(#sew-clip)">
        <rect x={17} y={27} width={62} height={80} fill="#BAE6FD" />
        <circle cx={62} cy={42} r={7} fill="#FDE68A" opacity={0.9} />
        {/* Soft mountains */}
        <path d="M17,86 L36,64 L50,78 L64,60 L79,80 L79,107 L17,107 Z" fill="#99F6E4" />
        <path d="M17,94 C32,82 50,84 79,90 L79,107 L17,107 Z" fill="#5EEAD4" />
        {/* Gentle drifting cloud */}
        <path className="bird" d="M26,44 Q32,40 38,44 Q44,40 50,44 H26 Z" fill="#FFFFFF" opacity={0.8} />
      </g>
      <line x1={48} y1={27} x2={48} y2={107} stroke="#E2E8F0" strokeWidth={2.5} />
      <line x1={17} y1={67} x2={79} y2={67} stroke="#E2E8F0" strokeWidth={2.5} />
    </g>

    <Desk x={152} y={112} w={80} />
    <Monitor x={168} y={72} />
    <FrontFigure seated />
    <path className="gaze" d="M112,54 Q84,46 58,50" stroke={P.guide} strokeWidth={2.2} strokeDasharray="3 4" fill="none" strokeLinecap="round" />
  </>
);

const EyeRoomScene = () => (
  <>
    <Backdrop id="ser" top="#F8FAFC" bottom="#EEF2FF" floor="#E0E7FF" />
    <Desk x={14} y={116} w={50} />
    <path d="M22,115 l6,-18 h24 l-4,18z" fill="#334155" />
    <path d="M25,113 l5,-14 h19 l-3,14z" fill={P.screen} opacity={0.8} />
    <Plant x={216} y={158} s={0.85} />
    <FrontFigure seated x={82} />
    <g className="gaze">
      <path d="M94,54 L190,44" stroke={P.guide} strokeWidth={1.8} strokeDasharray="3 5" strokeLinecap="round" fill="none" />
      <circle className="travel-dot" cx={94} cy={54} r={2.8} fill={P.guide} />
    </g>
  </>
);

const EyeRelaxScene = () => (
  <>
    <Backdrop id="sep" top="#FFF7ED" bottom="#F8FAFC" floor="#FFEDD5" />
    <g className="calm-rings">
      <circle cx={120} cy={76} r={48} fill="none" stroke="#FDBA74" strokeWidth={1.5} opacity={0.6} />
      <circle cx={120} cy={76} r={62} fill="none" stroke="#FED7AA" strokeWidth={1.5} opacity={0.4} />
    </g>
    <g className="breathe" style={o(120, 168)}>
      {/* Broad shoulders & torso */}
      <path d="M52,180 C54,134 82,122 120,122 C158,122 186,134 188,180 Z" fill={P.shirt} />
      <path d="M106,122 L120,138 L134,122" stroke={P.shirtD} strokeWidth={2.5} fill="none" />
      <rect x={108} y={98} width={24} height={26} rx={7} fill={P.skin} />

      {/* Portrait head */}
      <circle cx={86} cy={78} r={6.5} fill={P.skinD} />
      <circle cx={154} cy={78} r={6.5} fill={P.skinD} />
      <circle cx={120} cy={74} r={33} fill={P.skin} />
      <path d="M86,72 C84,32 156,32 154,72 C145,52 130,49 112,53 C100,56 91,63 86,72 Z" fill={P.hair} />
      <circle cx={100} cy={89} r={5.5} fill={P.blush} opacity={0.3} />
      <circle cx={140} cy={89} r={5.5} fill={P.blush} opacity={0.3} />

      {/* Eyes open & closed states */}
      <g className="eyes-open">
        <ellipse cx={107} cy={77} rx={3.8} ry={4.8} fill={P.ink} />
        <ellipse cx={133} cy={77} rx={3.8} ry={4.8} fill={P.ink} />
        <circle cx={108.5} cy={75.5} r={1.2} fill="#ffffff" />
        <circle cx={134.5} cy={75.5} r={1.2} fill="#ffffff" />
      </g>
      <g className="eyes-closed" stroke={P.ink} strokeWidth={2.4} fill="none" strokeLinecap="round">
        <path d="M101,78 q6,4.5 12,0" />
        <path d="M127,78 q6,4.5 12,0" />
      </g>
      <path d="M112,94 q8,5.5 16,0" stroke="#E11D48" strokeWidth={2} fill="none" strokeLinecap="round" />

      {/* Warm cupping palms */}
      <g className="palms">
        <g transform="rotate(14 102 80)">
          <ellipse cx={102} cy={82} rx={16} ry={20} fill={P.skinD} />
          <path d="M92,70 v-9 M97,67 v-11 M102,66 v-12 M107,67 v-10" stroke={P.skinD} strokeWidth={5.5} strokeLinecap="round" />
        </g>
        <g transform="rotate(-14 138 80)">
          <ellipse cx={138} cy={82} rx={16} ry={20} fill={P.skinD} />
          <path d="M148,70 v-9 M143,67 v-11 M138,66 v-12 M133,67 v-10" stroke={P.skinD} strokeWidth={5.5} strokeLinecap="round" />
        </g>
      </g>
    </g>
    <g className="sparkles" fill={P.accent}>
      <circle cx={54} cy={38} r={2.4} />
      <circle cx={186} cy={46} r={2} />
      <circle cx={174} cy={22} r={1.6} />
    </g>
  </>
);

/* ------------------------------------------------------------------------------------------------ */
/* 2. Posture & Neck Scenes                                                                         */
/* ------------------------------------------------------------------------------------------------ */

const NeckTiltScene = () => (
  <>
    <Backdrop id="snt" top="#F0FDFA" bottom="#F8FAFC" />
    <Plant x={28} y={158} s={0.9} />
    <Desk x={174} y={116} w={58} />
    <Monitor x={182} y={78} w={42} />
    <FrontFigure seated />
    {/* Elegant motion trajectory arcs */}
    <g className="guides" fill="none" strokeLinecap="round">
      <path d="M90,44 A32,32 0 0 1 106,18" stroke="#99F6E4" strokeWidth={3} strokeDasharray="2 5" />
      <path d="M150,44 A32,32 0 0 0 134,18" stroke="#99F6E4" strokeWidth={3} strokeDasharray="2 5" />
      <path className="arrow-l" d="M94,24 l-6,8 l9,2" stroke={P.guide} strokeWidth={2.6} strokeLinejoin="round" />
      <path className="arrow-r" d="M146,24 l6,8 l-9,2" stroke={P.guide} strokeWidth={2.6} strokeLinejoin="round" />
    </g>
  </>
);

const ShoulderRollScene = () => (
  <>
    <Backdrop id="ssr" top="#F0F9FF" bottom="#F8FAFC" />
    <Plant x={212} y={158} s={0.9} />
    <FrontFigure seated />
    {/* Harmonious circular cadence guides */}
    <g className="roll-arrows" fill="none" stroke={P.guide} strokeWidth={2.2} strokeLinecap="round">
      <g className="roll-l" style={o(88, 68)}>
        <path d="M88,54 A14,14 0 1 0 102,68" strokeDasharray="4 4" />
        <path d="M98,62 l4,6 l5,-5" strokeLinejoin="round" />
      </g>
      <g className="roll-r" style={o(152, 68)}>
        <path d="M152,54 A14,14 0 1 1 138,68" strokeDasharray="4 4" />
        <path d="M142,62 l-4,6 l-5,-5" strokeLinejoin="round" />
      </g>
    </g>
  </>
);

const PostureResetScene = () => (
  <>
    <Backdrop id="spr" top="#F0FDFA" bottom="#F8FAFC" />
    <Desk x={150} y={104} w={84} />
    <Monitor x={176} y={58} w={46} />
    <rect x={156} y={98} width={26} height={5} rx={2} fill="#475569" />

    {/* Ergonomic task chair side profile */}
    <rect x={82} y={64} width={10} height={54} rx={4} fill={P.chair} />
    <rect x={84} y={116} width={46} height={8} rx={4} fill={P.chairD} />
    <line x1={107} y1={124} x2={107} y2={150} stroke={P.chairD} strokeWidth={5} />
    <path d="M88,157 L107,150 L126,157" stroke={P.chairD} strokeWidth={4} fill="none" strokeLinecap="round" />
    <ellipse cx={112} cy={165} rx={34} ry={4} fill="#0F172A" opacity={0.07} />

    {/* Seated legs */}
    <line x1={103} y1={113} x2={135} y2={113} stroke={P.pants} strokeWidth={12} strokeLinecap="round" />
    <line x1={135} y1={113} x2={137} y2={153} stroke={P.pants} strokeWidth={10} strokeLinecap="round" />
    <path d="M132,152 h12 q5,0 5,4.6 v0.8 h-17 z" fill={P.shoe} stroke={P.shoeSole} strokeWidth={1} />

    {/* Articulating torso: slouched to tall alignment */}
    <g className="seat-torso" style={o(103, 114)}>
      <path d="M94,74 Q94,64 103,63.5 L107,63.5 Q114,64 114,74 L113,116 L95,116 Z" fill={P.shirt} />
      <path className="spine" d="M98,112 C97,98 97,84 99,68" stroke="#FBBF24" strokeWidth={2.6} strokeDasharray="3 4" fill="none" strokeLinecap="round" />
      <rect x={100} y={54} width={8} height={12} rx={3} fill={P.skin} />
      <g className="head" style={o(104, 59)}>
        <SideHead cx={106} cy={44} />
      </g>
      <g className="reach" style={o(105, 72)}>
        <line x1={105} y1={72} x2={118} y2={90} stroke={P.shirt} strokeWidth={8.5} strokeLinecap="round" />
        <line x1={118} y1={90} x2={140} y2={96} stroke={P.skin} strokeWidth={7} strokeLinecap="round" />
        <circle cx={143} cy={97} r={4} fill={P.skin} />
      </g>
    </g>

    {/* Luminous vertical spine alignment guide */}
    <g className="align-guide">
      <line x1={103} y1={24} x2={103} y2={116} stroke={P.guide} strokeWidth={1.8} strokeDasharray="3 4" />
      <circle cx={103} cy={20} r={3} fill={P.guide} />
    </g>
    <g className="slouch-warn" />
  </>
);

/* ------------------------------------------------------------------------------------------------ */
/* 3. Stand & Stretch Scenes                                                                        */
/* ------------------------------------------------------------------------------------------------ */

const StandOverheadScene = () => (
  <>
    <Backdrop id="sso" top="#ECFEFF" bottom="#F8FAFC" />
    <Plant x={208} y={158} s={0.9} />
    <g className="lift" style={o(120, 160)}>
      <FrontFigure />
    </g>
    <g className="up-arrows" stroke={P.guide} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M72,88 v-28 M65,68 l7,-8 7,8" />
      <path d="M168,88 v-28 M161,68 l7,-8 7,8" />
    </g>
    <g className="sparkles" fill={P.accent}>
      <circle cx={120} cy={8} r={2.4} />
      <circle cx={98} cy={14} r={1.8} />
      <circle cx={142} cy={14} r={1.8} />
    </g>
  </>
);

const StandSideScene = () => (
  <>
    <Backdrop id="sss" top="#F5F3FF" bottom="#F8FAFC" floor="#EDE9FE" />
    <Plant x={26} y={158} s={0.85} />
    <Plant x={214} y={158} s={0.8} />
    <FrontFigure />
    <g className="side-arcs" fill="none" strokeLinecap="round">
      <path className="arc-l" d="M82,96 C74,62 86,34 112,18" stroke="#8B5CF6" strokeWidth={2.4} strokeDasharray="3 5" />
      <path className="arc-r" d="M158,96 C166,62 154,34 128,18" stroke="#8B5CF6" strokeWidth={2.4} strokeDasharray="3 5" />
    </g>
  </>
);

const StandChestScene = () => (
  <>
    <Backdrop id="ssc" top="#FFF7ED" bottom="#F8FAFC" />
    <Plant x={32} y={158} s={1} />
    <g className="chest-figure">
      <SideFigure />
    </g>
    {/* Deep breath chest expansion pulses */}
    <g className="breath-rings" fill="none" stroke={P.accent} strokeWidth={2} strokeLinecap="round">
      <path className="br1" d="M141,76 q6,11 0,22" />
      <path className="br2" d="M148,72 q9,15 0,30" />
      <path className="br3" d="M155,68 q12,19 0,38" />
    </g>
  </>
);

/* ------------------------------------------------------------------------------------------------ */
/* 4. Walking Refresh Scenes                                                                        */
/* ------------------------------------------------------------------------------------------------ */

const WalkDeskScene = () => (
  <>
    <Backdrop id="swd" top="#F0FDFA" bottom="#F8FAFC" />
    {/* Workstation background being left behind */}
    <g className="scroll-slow">
      <Desk x={10} y={108} w={64} />
      <Monitor x={24} y={64} w={38} />
    </g>
    <g className="walk">
      <SideFigure />
    </g>
    <g className="motion-chevrons" stroke={P.guide} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M185,96 l8,8 l-8,8" />
      <path d="M197,96 l8,8 l-8,8" />
    </g>
  </>
);

const WalkStrollScene = () => (
  <>
    <Backdrop id="sws" top="#F0F9FF" bottom="#F8FAFC" />
    {/* Gentle background pillars & greenery */}
    <g className="scroll-slow">
      <rect x={18} y={30} width={12} height={133} fill="#E2E8F0" opacity={0.5} />
      <rect x={138} y={30} width={12} height={133} fill="#E2E8F0" opacity={0.5} />
      <rect x={258} y={30} width={12} height={133} fill="#E2E8F0" opacity={0.5} />
      <Plant x={90} y={158} s={0.8} />
      <Plant x={210} y={158} s={0.8} />
    </g>
    <g className="walk walk-slow">
      <SideFigure />
    </g>
  </>
);

const WalkGazeScene = () => (
  <>
    <Backdrop id="swg" top="#F0FDFA" bottom="#F8FAFC" />
    {/* Panoramic window wall on right */}
    <g>
      <rect x={172} y={20} width={58} height={143} rx={6} fill="#E0F2FE" />
      <circle cx={202} cy={46} r={10} fill="#FDE68A" opacity={0.9} />
      <path d="M172,130 L194,105 L210,120 L230,102 L230,163 L172,163 Z" fill="#99F6E4" />
    </g>
    <g className="walk">
      <SideFigure x={108} />
    </g>
    <g className="gaze">
      <path d="M118,52 L198,42" stroke={P.guide} strokeWidth={2} strokeDasharray="3 4" strokeLinecap="round" fill="none" />
      <circle cx={198} cy={42} r={3} fill={P.guide} />
    </g>
  </>
);

/* ------------------------------------------------------------------------------------------------ */
/* Scene Catalog & Resolver                                                                         */
/* ------------------------------------------------------------------------------------------------ */

export const SCENES: Record<string, SceneDef> = {
  'eye-window': {
    key: 'eye-window',
    label: 'Character turns gaze from screen to distant window scenic view',
    durationSec: 6.5,
    phases: ['Gaze out the window (20 ft / 6 m)', 'Blink gently and soften focus', 'Return rested to your screen'],
    render: EyeWindowScene,
  },
  'eye-room': {
    key: 'eye-room',
    label: 'Character looks across the room at a distant object to reset focus',
    durationSec: 6,
    phases: ['Look at a distant object in the room', 'Hold easy focus — blink softly', 'Return refreshed to your desk'],
    render: EyeRoomScene,
  },
  'eye-relax': {
    key: 'eye-relax',
    label: 'Character closes eyes, takes deep breaths, and rests palms warmly over eyes',
    durationSec: 6,
    phases: ['Close eyes softly and breathe in', 'Warm palms resting over eyes', 'Release hands and open refreshed'],
    render: EyeRelaxScene,
  },
  'neck-tilt': {
    key: 'neck-tilt',
    label: 'Seated character tilts head gently to each side to stretch neck muscles',
    durationSec: 7,
    phases: ['Tilt head gently to the left', 'Tilt head gently to the right', 'Return upright to center'],
    render: NeckTiltScene,
  },
  'shoulder-roll': {
    key: 'shoulder-roll',
    label: 'Character performs smooth backward shoulder circles to release desk tension',
    durationSec: 4.5,
    phases: ['Lift shoulders up toward ears', 'Roll backward in a wide circle', 'Lower down and repeat smoothly'],
    render: ShoulderRollScene,
  },
  'posture-reset': {
    key: 'posture-reset',
    label: 'Side view: slouched desk posture corrects smoothly into neutral upright alignment',
    durationSec: 6,
    phases: ['Notice any slumping or forward head', 'Sit tall, pull shoulders back and down', 'Align spine and breathe deeply'],
    render: PostureResetScene,
  },
  'stand-overhead': {
    key: 'stand-overhead',
    label: 'Standing figure reaches both arms overhead and rises tall, then lowers slowly',
    durationSec: 6.5,
    phases: ['Stand tall with feet flat', 'Reach both arms high overhead', 'Lengthen spine, then lower slowly'],
    render: StandOverheadScene,
  },
  'stand-side-stretch': {
    key: 'stand-side-stretch',
    label: 'Standing figure reaches one arm overhead and leans gracefully to each side',
    durationSec: 7,
    phases: ['Reach right arm over and lean left', 'Reach left arm over and lean right', 'Return balanced to center'],
    render: StandSideScene,
  },
  'stand-chest-opener': {
    key: 'stand-chest-opener',
    label: 'Side view: hands clasp behind the back and chest opens with deep diaphragmatic breath',
    durationSec: 6,
    phases: ['Clasp hands behind your lower back', 'Roll shoulders back, expand chest', 'Breathe deeply and release'],
    render: StandChestScene,
  },
  'walking-break': {
    key: 'walking-break',
    label: 'Figure walks away from workstation with fluid, natural stride',
    durationSec: 4,
    phases: ['Stand up and leave your desk', 'Walk with a relaxed, natural stride', 'Swing arms loosely and breathe'],
    render: WalkDeskScene,
  },
  'walk-stroll': {
    key: 'walk-stroll',
    label: 'Figure strolls at an easy, relaxed pace with open posture',
    durationSec: 4,
    phases: ['Step away down the hall or outside', 'Maintain an easy, relaxed pace', 'Let your shoulders drop and relax'],
    render: WalkStrollScene,
  },
  'walk-distant-gaze': {
    key: 'walk-distant-gaze',
    label: 'Figure walks toward a panoramic window, gazing at the distant horizon',
    durationSec: 4,
    phases: ['Walk toward an open window or vista', 'Gaze out at the far horizon', 'Let your eyes and mind unwind'],
    render: WalkGazeScene,
  },
};

/** Aliases for variation keys and legacy calls. */
const ALIASES: Record<string, string> = {
  'eye-window': 'eye-window',
  'eye-room': 'eye-room',
  'eye-relax': 'eye-relax',
  'eye-distance': 'eye-window',
  'eye-palming': 'eye-relax',
  'neck-side-stretch': 'neck-tilt',
  'neck-tilt': 'neck-tilt',
  'posture-neck-stretch': 'neck-tilt',
  'neck-shoulder': 'neck-tilt',
  'shoulder-rolls': 'shoulder-roll',
  'shoulder-roll': 'shoulder-roll',
  'posture-shoulder-rolls': 'shoulder-roll',
  'posture-reset': 'posture-reset',
  'stand-overhead': 'stand-overhead',
  'stand-reset': 'stand-overhead',
  'stand-side-stretch': 'stand-side-stretch',
  'stand-chest-opener': 'stand-chest-opener',
  'walking-break': 'walking-break',
  'walk-desk': 'walking-break',
  'walk-stroll': 'walk-stroll',
  'walk-distant-gaze': 'walk-distant-gaze',
};

const TYPE_DEFAULT: Record<string, string> = {
  'eye-break': 'eye-window',
  'posture-stretch': 'neck-tilt',
  'stand-move': 'stand-overhead',
  walking: 'walking-break',
};

export function resolveScene(illustrationKey?: string, type?: string): SceneDef | null {
  const key = illustrationKey ? ALIASES[illustrationKey] || illustrationKey : undefined;
  if (key && SCENES[key]) return SCENES[key];
  if (type && TYPE_DEFAULT[type]) return SCENES[TYPE_DEFAULT[type]];
  return null;
}

/** Renders one looping scene in the standardized 240x180 viewport. */
export const ExerciseScene: React.FC<{ scene: SceneDef }> = ({ scene }) => (
  <div className="sc-stage" style={{ ['--sc-dur' as any]: `${scene.durationSec}s` }}>
    <svg className={`sc sc-${scene.key}`} viewBox="0 0 240 180" role="img" aria-label={scene.label}>
      <defs>
        <clipPath id={`sc-clip-${scene.key}`}>
          <rect x={0} y={0} width={240} height={180} rx={14} />
        </clipPath>
      </defs>
      <g clipPath={`url(#sc-clip-${scene.key})`}>{scene.render()}</g>
    </svg>
  </div>
);

/** Shows the current step of the scene, synchronized with the animation loop. */
export const PhaseTicker: React.FC<{ scene: SceneDef }> = ({ scene }) => {
  const n = scene.phases.length;
  return (
    <div className="sc-ticker" style={{ ['--sc-dur' as any]: `${scene.durationSec}s` }} aria-live="off">
      <div className="sc-ticker-dots">
        {scene.phases.map((_, i) => (
          <span
            key={i}
            className={`sc-dot sc-phase-${n}`}
            style={{ animationDelay: `calc(var(--sc-dur) * ${(i - n) / n})` }}
          />
        ))}
      </div>
      <div className="sc-ticker-labels">
        {scene.phases.map((p, i) => (
          <span
            key={p}
            className={`sc-label sc-phase-${n}`}
            style={{ animationDelay: `calc(var(--sc-dur) * ${(i - n) / n})` }}
          >
            <b>{i + 1}</b> {p}
          </span>
        ))}
      </div>
    </div>
  );
};
