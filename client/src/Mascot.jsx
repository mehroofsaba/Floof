export const Sparkle = ({ c = "#f6c667", s = 16, style }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" style={style} className="spark">
    <path
      d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z"
      fill={c}
    />
  </svg>
);
const arc = (x, up) => (
  <path
    d={up ? `M${x - 6} 54q6 -8 12 0` : `M${x - 6} 52q6 5 12 0`}
    stroke="#4a2c4a"
    strokeWidth="3"
    fill="none"
    strokeLinecap="round"
  />
);
export default function Mascot({ size = 90, mood = "happy" }) {
  const closed = mood === "sleepy" || mood === "chill";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mascot">
      <circle cx="22" cy="26" r="13" fill="#e9b88a" />
      <circle cx="78" cy="26" r="13" fill="#e9b88a" />
      <circle cx="22" cy="26" r="6" fill="#f7c9d4" />
      <circle cx="78" cy="26" r="6" fill="#f7c9d4" />
      <ellipse cx="50" cy="58" rx="38" ry="34" fill="#f3cfa3" />
      <ellipse cx="50" cy="68" rx="14" ry="10" fill="#fff4e6" />
      {mood === "party" ? (
        <>
          {arc(36, true)}
          {arc(64, true)}
        </>
      ) : closed ? (
        <>
          {arc(36)}
          {arc(64)}
        </>
      ) : (
        <>
          <circle cx="36" cy="52" r="4" fill="#4a2c4a" />
          <circle cx="64" cy="52" r="4" fill="#4a2c4a" />
        </>
      )}
      {mood === "worried" && (
        <>
          <path
            d="M29 43l14 -3M71 43l-14 -3"
            stroke="#4a2c4a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M82 40q4 6 0 9q-4 -3 0 -9z" fill="#bfe0f5" />
        </>
      )}
      <ellipse cx="27" cy="63" rx="7" ry="4.5" fill="#f7a9bd" opacity=".7" />
      <ellipse cx="73" cy="63" rx="7" ry="4.5" fill="#f7a9bd" opacity=".7" />
      <ellipse cx="50" cy="62" rx="4" ry="3" fill="#4a2c4a" />
      {mood === "party" ? (
        <ellipse cx="50" cy="73" rx="5" ry="4" fill="#e88aa5" />
      ) : mood === "worried" ? (
        <path
          d="M44 72q3 -3 6 0t6 0"
          stroke="#4a2c4a"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M44 69q6 5 12 0"
          stroke="#4a2c4a"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {mood === "focus" && (
        <>
          <path
            d="M12 56Q50 -8 88 56"
            stroke="#8b78e6"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="5" y="48" width="14" height="22" rx="6" fill="#8b78e6" />
          <rect x="81" y="48" width="14" height="22" rx="6" fill="#8b78e6" />
        </>
      )}
      {mood === "sleepy" && (
        <text x="80" y="22" fontSize="16" fontFamily="Mali" fill="#8b78e6">
          z
        </text>
      )}
    </svg>
  );
}
export function Bunny({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="mascot">
      <rect x="6" y="90" width="108" height="14" rx="4" fill="#cdb8f0" />
      <rect x="12" y="78" width="96" height="13" rx="4" fill="#f7b6c2" />
      <rect x="18" y="67" width="84" height="12" rx="4" fill="#fbe3a6" />
      <ellipse cx="46" cy="24" rx="7" ry="19" fill="#fff" stroke="#f0dde4" />
      <ellipse cx="74" cy="24" rx="7" ry="19" fill="#fff" stroke="#f0dde4" />
      <ellipse cx="46" cy="26" rx="3" ry="12" fill="#f7c9d4" />
      <ellipse cx="74" cy="26" rx="3" ry="12" fill="#f7c9d4" />
      <ellipse cx="60" cy="52" rx="26" ry="19" fill="#fff" stroke="#f0dde4" />
      <path
        d="M44 50q5 4 10 0M66 50q5 4 10 0"
        stroke="#4a2c4a"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="40" cy="58" rx="5" ry="3.5" fill="#f7a9bd" opacity=".7" />
      <ellipse cx="80" cy="58" rx="5" ry="3.5" fill="#f7a9bd" opacity=".7" />
      <ellipse cx="60" cy="57" rx="3" ry="2.2" fill="#e88aa5" />
    </svg>
  );
}
export function Desk({ mood }) {
  return (
    <div className="desk">
      <svg width="170" height="110" viewBox="0 0 170 110">
        <rect
          x="10"
          y="10"
          width="58"
          height="46"
          rx="6"
          fill="#fde4ec"
          stroke="#f7b6c2"
          strokeWidth="3"
        />
        <path d="M10 10l10 46M68 10l-10 46" stroke="#f7b6c2" opacity=".5" />
        <rect x="6" y="88" width="158" height="10" rx="5" fill="#e9b88a" />
        <rect x="92" y="66" width="48" height="24" rx="3" fill="#cdb8f0" />
        <rect x="86" y="88" width="60" height="4" rx="2" fill="#b79ee4" />
        <rect x="148" y="74" width="14" height="14" rx="3" fill="#fcd5b0" />
        <path
          d="M155 74c-8-14-10-18-4-24M155 74c8-12 10-16 5-22M155 74v-26"
          stroke="#8fd2a4"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <div className="deskbear">
        <Mascot size={62} mood={mood} />
      </div>
    </div>
  );
}
