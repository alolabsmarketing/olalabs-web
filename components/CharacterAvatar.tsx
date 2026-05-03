import { type ReactElement } from "react";
import { cn } from "@/lib/utils";

interface Props {
  characterId: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: 48,
  md: 80,
  lg: 140,
  xl: 200,
};

function EmmaAvatar() {
  return (
    <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Background: deep navy center, mid-blue edges */}
        <radialGradient id="emma-bg" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#1a4ac8" />
          <stop offset="55%" stopColor="#0e2d8a" />
          <stop offset="100%" stopColor="#050e28" />
        </radialGradient>
        {/* Soft glow halo */}
        <radialGradient id="emma-halo" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor="#4a80ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4a80ff" stopOpacity="0" />
        </radialGradient>
        {/* Light rays overlay */}
        <radialGradient id="emma-rays" cx="50%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#6090ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6090ff" stopOpacity="0" />
        </radialGradient>
        {/* Skin: warm, 3D radial */}
        <radialGradient id="emma-skin" cx="42%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#f8d4b4" />
          <stop offset="50%" stopColor="#f4c5a0" />
          <stop offset="100%" stopColor="#d8996e" />
        </radialGradient>
        {/* Hair: chestnut brown with depth */}
        <linearGradient id="emma-hair" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#6e3c1e" />
          <stop offset="40%" stopColor="#4a2614" />
          <stop offset="100%" stopColor="#2e1608" />
        </linearGradient>
        <linearGradient id="emma-hair2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7a4828" />
          <stop offset="100%" stopColor="#3a1e0c" />
        </linearGradient>
        {/* Shoulder/vignette fade */}
        <linearGradient id="emma-shoulder" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a3a90" />
          <stop offset="100%" stopColor="#06102a" />
        </linearGradient>
        <radialGradient id="emma-vignette" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="#050e28" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#050e28" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background fill */}
      <rect width="200" height="220" fill="url(#emma-bg)" />
      {/* Light rays */}
      <ellipse cx="100" cy="30" rx="90" ry="110" fill="url(#emma-rays)" />
      {/* Glow halo behind figure */}
      <ellipse cx="100" cy="130" rx="75" ry="80" fill="url(#emma-halo)" />

      {/* Shoulders — smooth bezier silhouette */}
      <path
        d="M20 220 C20 185 52 172 72 168 L88 200 L112 200 L128 168 C148 172 180 185 180 220 Z"
        fill="url(#emma-shoulder)"
      />
      {/* Neck */}
      <path
        d="M88 165 C86 172 85 180 86 195 L114 195 C115 180 114 172 112 165 Q100 158 88 165 Z"
        fill="url(#emma-skin)"
      />

      {/* Hair back layer (behind head) — loose updo bun shape */}
      <path
        d="M56 118 C50 95 54 70 68 58 C78 50 90 44 100 42 C110 44 122 50 132 58 C146 70 150 95 144 118 C138 105 130 98 120 96 C110 93 100 93 100 93 C100 93 90 93 80 96 C70 98 62 105 56 118 Z"
        fill="url(#emma-hair2)"
      />

      {/* Head — smooth, slightly oval */}
      <path
        d="M58 125 C56 100 62 78 72 66 C82 54 92 48 100 48 C108 48 118 54 128 66 C138 78 144 100 142 125 C140 148 128 166 114 170 C108 172 104 172 100 172 C96 172 92 172 86 170 C72 166 60 148 58 125 Z"
        fill="url(#emma-skin)"
      />

      {/* Hair — main top mass */}
      <path
        d="M58 118 C56 98 60 72 72 60 C80 52 90 46 100 44 C110 46 120 52 128 60 C140 72 144 98 142 118 C136 102 126 95 116 94 C110 92 106 92 100 92 C94 92 90 92 84 94 C74 95 64 102 58 118 Z"
        fill="url(#emma-hair)"
      />

      {/* Bun — top center, loose updo */}
      <ellipse cx="100" cy="52" rx="22" ry="18" fill="url(#emma-hair)" />
      <ellipse cx="100" cy="46" rx="14" ry="12" fill="#5c3018" />
      <ellipse cx="96" cy="44" rx="6" ry="5" fill="#7a4828" fillOpacity="0.5" />
      {/* Bun texture strands */}
      <path d="M88 50 Q100 42 112 50" stroke="#7a4828" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M90 54 Q100 47 110 54" stroke="#8a5830" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />

      {/* Side hair wisps framing face */}
      <path
        d="M58 110 C52 118 52 132 54 148 C58 142 60 130 62 118 Z"
        fill="url(#emma-hair)"
        opacity="0.85"
      />
      <path
        d="M142 110 C148 118 148 132 146 148 C142 142 140 130 138 118 Z"
        fill="url(#emma-hair)"
        opacity="0.85"
      />

      {/* Eyebrows */}
      <path d="M75 110 C80 106 86 106 91 109" stroke="#3e2010" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M109 109 C114 106 120 106 125 110" stroke="#3e2010" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Eyes — white sclera with dark iris */}
      <ellipse cx="83" cy="120" rx="9" ry="7" fill="#f8f0e8" />
      <ellipse cx="117" cy="120" rx="9" ry="7" fill="#f8f0e8" />
      <ellipse cx="83" cy="121" rx="6" ry="5.5" fill="#2a180c" />
      <ellipse cx="117" cy="121" rx="6" ry="5.5" fill="#2a180c" />
      <ellipse cx="82" cy="120" rx="2.5" ry="2.5" fill="#0a0604" />
      <ellipse cx="116" cy="120" rx="2.5" ry="2.5" fill="#0a0604" />
      {/* Eye highlight dots */}
      <ellipse cx="85" cy="118" rx="1.5" ry="1.5" fill="white" opacity="0.9" />
      <ellipse cx="119" cy="118" rx="1.5" ry="1.5" fill="white" opacity="0.9" />

      {/* Nose — gentle suggestion */}
      <path d="M97 132 Q100 138 103 132" stroke="#c4845a" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />

      {/* Lips — soft curved smile */}
      <path d="M88 147 C93 152 107 152 112 147" stroke="#c07858" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M88 147 C93 150 107 150 112 147" fill="#d4907a" fillOpacity="0.35" />

      {/* Blush */}
      <ellipse cx="70" cy="134" rx="11" ry="7" fill="#f4a080" fillOpacity="0.25" />
      <ellipse cx="130" cy="134" rx="11" ry="7" fill="#f4a080" fillOpacity="0.25" />

      {/* Bottom vignette */}
      <rect x="0" y="160" width="200" height="60" fill="url(#emma-vignette)" />
    </svg>
  );
}

function NoahAvatar() {
  return (
    <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Background: deep navy-blue */}
        <radialGradient id="noah-bg" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#1e4a8a" />
          <stop offset="55%" stopColor="#0c2454" />
          <stop offset="100%" stopColor="#040c1e" />
        </radialGradient>
        <radialGradient id="noah-halo" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="noah-rays" cx="50%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#80b8ff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#80b8ff" stopOpacity="0" />
        </radialGradient>
        {/* Skin: deep warm-brown */}
        <radialGradient id="noah-skin" cx="42%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#9a6438" />
          <stop offset="50%" stopColor="#7a4a28" />
          <stop offset="100%" stopColor="#502e10" />
        </radialGradient>
        {/* Hair: near-black coily */}
        <radialGradient id="noah-hair" cx="40%" cy="25%" r="65%">
          <stop offset="0%" stopColor="#1a1006" />
          <stop offset="70%" stopColor="#0e0a04" />
          <stop offset="100%" stopColor="#060402" />
        </radialGradient>
        <radialGradient id="noah-hair-coil" cx="30%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#282010" />
          <stop offset="100%" stopColor="#080604" />
        </radialGradient>
        <linearGradient id="noah-shoulder" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0c2454" />
          <stop offset="100%" stopColor="#040c1e" />
        </linearGradient>
        <radialGradient id="noah-vignette" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="#040c1e" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#040c1e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="200" height="220" fill="url(#noah-bg)" />
      <ellipse cx="100" cy="30" rx="90" ry="110" fill="url(#noah-rays)" />
      <ellipse cx="100" cy="130" rx="75" ry="80" fill="url(#noah-halo)" />

      {/* Shoulders */}
      <path
        d="M20 220 C20 185 52 172 72 168 L88 200 L112 200 L128 168 C148 172 180 185 180 220 Z"
        fill="url(#noah-shoulder)"
      />
      {/* Neck */}
      <path
        d="M88 166 C86 173 85 181 86 195 L114 195 C115 181 114 173 112 166 Q100 159 88 166 Z"
        fill="url(#noah-skin)"
      />

      {/* Hair back layer */}
      <path
        d="M54 122 C48 97 54 70 66 57 C77 46 89 41 100 40 C111 41 123 46 134 57 C146 70 152 97 146 122 C140 104 130 96 118 94 C108 92 100 92 100 92 C100 92 92 92 82 94 C70 96 60 104 54 122 Z"
        fill="url(#noah-hair)"
      />

      {/* Head */}
      <path
        d="M58 127 C56 102 62 78 72 66 C82 54 92 48 100 48 C108 48 118 54 128 66 C138 78 144 102 142 127 C140 151 128 169 114 173 C108 175 104 175 100 175 C96 175 92 175 86 173 C72 169 60 151 58 127 Z"
        fill="url(#noah-skin)"
      />

      {/* Tight coily hair — close to head, smooth silhouette */}
      <path
        d="M54 118 C52 96 56 70 68 57 C78 47 90 42 100 41 C110 42 122 47 132 57 C144 70 148 96 146 118 C140 102 130 94 118 93 C108 91 100 91 100 91 C100 91 92 91 82 93 C70 94 60 102 54 118 Z"
        fill="url(#noah-hair)"
      />
      {/* Coily texture bumps — tightly packed */}
      <ellipse cx="82" cy="69" rx="10" ry="8" fill="url(#noah-hair-coil)" />
      <ellipse cx="96" cy="64" rx="10" ry="7" fill="url(#noah-hair-coil)" />
      <ellipse cx="110" cy="64" rx="10" ry="7" fill="url(#noah-hair-coil)" />
      <ellipse cx="122" cy="69" rx="10" ry="8" fill="url(#noah-hair-coil)" />
      <ellipse cx="72" cy="76" rx="9" ry="8" fill="url(#noah-hair-coil)" />
      <ellipse cx="128" cy="76" rx="9" ry="8" fill="url(#noah-hair-coil)" />
      <ellipse cx="100" cy="61" rx="9" ry="7" fill="url(#noah-hair-coil)" />
      {/* Subtle sheen on hair */}
      <ellipse cx="88" cy="67" rx="4" ry="2.5" fill="#302818" fillOpacity="0.45" />
      <ellipse cx="112" cy="66" rx="4" ry="2.5" fill="#302818" fillOpacity="0.45" />

      {/* Temple/sideburn area */}
      <path d="M56 112 C50 122 50 138 52 152 C56 144 58 130 60 118 Z" fill="url(#noah-hair)" opacity="0.9" />
      <path d="M144 112 C150 122 150 138 148 152 C144 144 142 130 140 118 Z" fill="url(#noah-hair)" opacity="0.9" />

      {/* Eyebrows */}
      <path d="M74 109 C80 105 86 105 92 108" stroke="#0e0a04" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M108 108 C114 105 120 105 126 109" stroke="#0e0a04" strokeWidth="2.8" strokeLinecap="round" fill="none" />

      {/* Eyes */}
      <ellipse cx="83" cy="120" rx="9" ry="7" fill="#f0e8e0" />
      <ellipse cx="117" cy="120" rx="9" ry="7" fill="#f0e8e0" />
      <ellipse cx="83" cy="121" rx="6" ry="5.5" fill="#140e06" />
      <ellipse cx="117" cy="121" rx="6" ry="5.5" fill="#140e06" />
      <ellipse cx="82" cy="120" rx="2.5" ry="2.5" fill="#060402" />
      <ellipse cx="116" cy="120" rx="2.5" ry="2.5" fill="#060402" />
      <ellipse cx="85" cy="118" rx="1.5" ry="1.5" fill="white" opacity="0.85" />
      <ellipse cx="119" cy="118" rx="1.5" ry="1.5" fill="white" opacity="0.85" />

      {/* Nose — slightly broader */}
      <path d="M96 132 Q100 139 104 132" stroke="#50280c" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.65" />
      <ellipse cx="95" cy="135" rx="4" ry="2.5" fill="#50280c" fillOpacity="0.28" />
      <ellipse cx="105" cy="135" rx="4" ry="2.5" fill="#50280c" fillOpacity="0.28" />

      {/* Smile — relaxed, warm */}
      <path d="M87 149 C92 156 108 156 113 149" stroke="#50280c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M87 149 C92 153 108 153 113 149" fill="#7a4828" fillOpacity="0.3" />

      <rect x="0" y="160" width="200" height="60" fill="url(#noah-vignette)" />
    </svg>
  );
}

const AVATAR_MAP: Record<string, () => ReactElement> = {
  emma: EmmaAvatar,
  noah: NoahAvatar,
};

export default function CharacterAvatar({ characterId, size = "md", className }: Props) {
  const px = sizes[size];
  const AvatarComponent = AVATAR_MAP[characterId] ?? EmmaAvatar;

  return (
    <div
      className={cn("rounded-full overflow-hidden flex-shrink-0", className)}
      style={{ width: px, height: px }}
    >
      <AvatarComponent />
    </div>
  );
}
