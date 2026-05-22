// Doran shared atoms — Mascot, Bubble, Pill, Header.

function Mascot({ size = 80, style }) {
  return (
    <div
      className="mascot"
      style={{ width: size, height: size, ...style }}
    />
  );
}

function Bubble({ children, soft, accent, style }) {
  const cls =
    "bubble" +
    (soft ? " bubble--soft" : "") +
    (accent ? " bubble--accent" : "");
  return <div className={cls} style={style}>{children}</div>;
}

function Pill({ children, onClick, accent, ghost, icon, style }) {
  const cls =
    "pill" +
    (accent ? " pill--accent" : "") +
    (ghost ? " pill--ghost" : "");
  return (
    <button className={cls} onClick={onClick} style={style}>
      {icon && <span className="material-symbols-rounded" style={{fontSize: 14}}>{icon}</span>}
      {children}
    </button>
  );
}

function ScreenHead({ title, onBack, progress }) {
  return (
    <div className="head">
      {onBack && (
        <button className="head__back" onClick={onBack} aria-label="뒤로">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
      )}
      <span className="head__title">{title}</span>
      {progress && <span className="head__progress">{progress}</span>}
    </div>
  );
}

// A small SVG silhouette used as camera fallback (no permission / iframe).
function CameraSilhouette({ tone = "warm" }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
         style={{position:"absolute", inset:0, width:"100%", height:"100%"}}>
      <defs>
        <radialGradient id="bg" cx="50%" cy="35%" r="70%">
          <stop offset="0%"  stopColor="#5C3A1E"/>
          <stop offset="100%" stopColor="#1B1410"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#bg)"/>
      {/* shoulders */}
      <path d="M0,100 C 15,72 30,68 50,68 C 70,68 85,72 100,100 Z"
            fill="#3a2614"/>
      {/* head */}
      <circle cx="50" cy="42" r="18" fill="#3a2614"/>
      {/* highlight */}
      <circle cx="44" cy="36" r="4" fill="rgba(219,169,136,0.25)"/>
    </svg>
  );
}

Object.assign(window, { Mascot, Bubble, Pill, ScreenHead, CameraSilhouette });
