import React, { useMemo } from 'react';

function buildItems(count) {
  // Deterministic-ish layout (no Math.random per render) so it doesn't jump around.
  const items = [];
  for (let i = 0; i < count; i++) {
    const left = (i * 37) % 100; // %
    const top = (i * 23) % 100; // %
    const size = 10 + ((i * 13) % 18); // px
    const drift = 10 + ((i * 7) % 30); // px
    const duration = 10 + ((i * 5) % 18); // s
    const delay = ((i * 11) % 40) / 10; // s
    const opacity = 0.25 + (((i * 9) % 40) / 100); // 0.25 - 0.65
    const kind = i % 4; // variant-dependent

    items.push({ left, top, size, drift, duration, delay, opacity, kind });
  }
  return items;
}

function starSvg(fill) {
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path fill="${fill}" d="M50 5l13 27 30 4-22 21 6 30-27-14-27 14 6-30L7 36l30-4z"/>
      </svg>`
    )
  );
}

function ornamentSvg(fill) {
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path fill="${fill}" d="M55 10c0 5-3 9-8 9s-8-4-8-9 3-9 8-9 8 4 8 9z"/>
        <path fill="${fill}" d="M50 22c-19 0-34 15-34 34s15 34 34 34 34-15 34-34-15-34-34-34z"/>
        <path fill="rgba(255,255,255,0.25)" d="M36 34c6-5 14-8 22-8 6 0 11 1 16 3-7-6-15-9-24-9-8 0-15 3-21 7-6 5-9 11-11 19 3-5 8-9 18-12z"/>
      </svg>`
    )
  );
}

function sparkleSvg(fill) {
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path fill="${fill}" d="M50 8l7 28 28 7-28 7-7 42-7-42-28-7 28-7z"/>
      </svg>`
    )
  );
}

function lanternSvg(palette) {
  const red = palette?.lantern || 'rgba(220,38,38,0.55)';
  const gold = palette?.gold || 'rgba(255,215,0,0.55)';
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <path d="M60 10c10 0 18 8 18 18 0 3-1 6-2 8 11 7 18 19 18 34 0 22-15 38-34 38S26 92 26 70c0-15 7-27 18-34-1-2-2-5-2-8 0-10 8-18 18-18z" fill="${red}"/>
        <path d="M42 30c0-10 8-18 18-18s18 8 18 18c0 2 0 4-1 6-8-3-17-4-26 0-1-2-1-4-1-6z" fill="${gold}" opacity="0.45"/>
        <path d="M38 70c0 16 10 28 22 28s22-12 22-28c0-8-2-14-6-20 2 5 3 10 3 16 0 16-8 26-19 26S41 82 41 66c0-6 1-11 3-16-4 6-6 12-6 20z" fill="rgba(255,255,255,0.18)"/>
        <path d="M52 104h16v6H52z" fill="${gold}" opacity="0.65"/>
        <path d="M60 110v8" stroke="${gold}" stroke-width="3" stroke-linecap="round" opacity="0.65"/>
        <circle cx="60" cy="30" r="6" fill="${gold}" opacity="0.75"/>
      </svg>`
    )
  );
}

function coinSvg(palette) {
  const gold = palette?.gold || 'rgba(255,215,0,0.55)';
  const stroke = palette?.coinStroke || 'rgba(180,83,9,0.45)';
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <ellipse cx="60" cy="60" rx="42" ry="42" fill="${gold}"/>
        <ellipse cx="60" cy="60" rx="34" ry="34" fill="rgba(255,255,255,0.12)" stroke="${stroke}" stroke-width="6"/>
        <rect x="50" y="38" width="20" height="44" rx="6" fill="rgba(154,52,18,0.35)"/>
      </svg>`
    )
  );
}

function cloudSvg(palette) {
  const cloud = palette?.cloud || 'rgba(255,255,255,0.30)';
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120">
        <path d="M50 86c-16 0-28-10-28-22 0-10 7-18 18-21 4-16 20-28 38-28 16 0 30 9 36 22 2-1 5-1 8-1 16 0 30 12 30 27s-14 23-30 23H50z" fill="${cloud}"/>
      </svg>`
    )
  );
}

function firecrackerSvg(palette) {
  const red = palette?.lantern || 'rgba(220,38,38,0.55)';
  const gold = palette?.gold || 'rgba(255,215,0,0.55)';
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <rect x="34" y="26" width="52" height="68" rx="10" fill="${red}"/>
        <rect x="34" y="40" width="52" height="6" fill="${gold}" opacity="0.75"/>
        <rect x="34" y="58" width="52" height="6" fill="${gold}" opacity="0.65"/>
        <rect x="34" y="76" width="52" height="6" fill="${gold}" opacity="0.55"/>
        <path d="M60 20c10-8 20-6 26 2" fill="none" stroke="${gold}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
        <circle cx="92" cy="28" r="6" fill="${gold}" opacity="0.8"/>
      </svg>`
    )
  );
}

export default function FloatingItemsBackdrop({ enabled, palette, variant = 'christmas' }) {
  const items = useMemo(() => buildItems(24), []);

  if (!enabled) return null;

  const christmasStarUrl = starSvg(palette?.star || 'rgba(255,215,0,0.55)');
  const christmasOrnamentUrl = ornamentSvg(palette?.ornament || 'rgba(220,38,38,0.50)');
  const christmasSparkleUrl = sparkleSvg(palette?.sparkle || 'rgba(255,255,255,0.45)');
  const cnyLanternUrl = lanternSvg(palette);
  const cnyCoinUrl = coinSvg(palette);
  const cnyCloudUrl = cloudSvg(palette);
  const cnyFirecrackerUrl = firecrackerSvg(palette);

  const getUrl = (kind) => {
    if (variant === 'cny') {
      return kind === 0 ? cnyLanternUrl : kind === 1 ? cnyCoinUrl : kind === 2 ? cnyCloudUrl : cnyFirecrackerUrl;
    }
    // default/christmas
    return kind === 0 ? christmasStarUrl : kind === 1 ? christmasOrnamentUrl : christmasSparkleUrl;
  };

  return (
    <div className="floating-backdrop" aria-hidden="true">
      <style>{`
        .floating-backdrop {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .floating-item {
          position: absolute;
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          filter: blur(0px);
          animation-name: floatBob, floatDrift;
          animation-timing-function: ease-in-out, ease-in-out;
          animation-iteration-count: infinite, infinite;
          will-change: transform;
        }
        @keyframes floatBob {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(0, -18px, 0) rotate(10deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }
        @keyframes floatDrift {
          0% { margin-left: 0px; }
          50% { margin-left: 24px; }
          100% { margin-left: 0px; }
        }
      `}</style>

      {items.map((it, idx) => (
        <span
          key={idx}
          className="floating-item"
          style={{
            left: `${it.left}%`,
            top: `${it.top}%`,
            width: `${it.size}px`,
            height: `${it.size}px`,
            opacity: it.opacity,
            backgroundImage: `url("${getUrl(it.kind)}")`,
            animationDuration: `${it.duration}s, ${Math.max(8, it.duration - 2)}s`,
            animationDelay: `${it.delay}s, ${it.delay / 2}s`
          }}
        />
      ))}
    </div>
  );
}
