const christmasTheme = {
  key: 'christmas',
  label: 'Christmas',
  strings: {
    appTitle: 'TGI Attendance System',
    appSubtitle: 'Christmas Edition',
    footerGreeting: 'Merry Christmas and Happy New Year!',
    footerCopyright: '© 2026 TGI Japanese Language School. All rights reserved.',
    footerDev: 'Dev by Htut'
  },
  images: {
    logoUrl: 'https://i.ibb.co/Gvb5m1p5/0b2cb75f-e9f1-43c1-aa40-4ea1b7b522f5-removebg-preview.png',
    // Inline SVGs so you don't depend on external image hosts.
    decoLeftUrl:
      'data:image/svg+xml,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">
          <defs>
            <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="rgba(0,0,0,0.14)"/>
            </filter>
            <linearGradient id="tree" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#22c55e"/>
              <stop offset="1" stop-color="#15803d"/>
            </linearGradient>
            <linearGradient id="trunk" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#92400e"/>
              <stop offset="1" stop-color="#7c2d12"/>
            </linearGradient>
          </defs>
          <g filter="url(#s)">
            <path d="M130 20l10 20 22 3-16 15 4 22-20-10-20 10 4-22-16-15 22-3z" fill="rgba(255,215,0,0.95)"/>
            <path d="M130 52c-22 20-42 48-60 84h120c-18-36-38-64-60-84z" fill="url(#tree)"/>
            <path d="M130 86c-26 20-50 52-72 96h144c-22-44-46-76-72-96z" fill="url(#tree)"/>
            <path d="M130 124c-30 22-60 62-88 118h176c-28-56-58-96-88-118z" fill="url(#tree)"/>
            <path d="M118 214h24v36h-24z" fill="url(#trunk)"/>
            <path d="M122 214h8v36h-8z" fill="rgba(255,255,255,0.12)"/>

            <path d="M84 150c22 8 46 12 72 12s50-4 72-12" fill="none" stroke="rgba(255,255,255,0.40)" stroke-width="6" stroke-linecap="round"/>
            <path d="M92 178c18 7 39 10 62 10s44-3 62-10" fill="none" stroke="rgba(255,215,0,0.55)" stroke-width="5" stroke-linecap="round"/>
            <path d="M100 204c15 6 32 8 50 8s35-2 50-8" fill="none" stroke="rgba(220,38,38,0.45)" stroke-width="5" stroke-linecap="round"/>

            <circle cx="110" cy="128" r="7" fill="rgba(220,38,38,0.95)"/>
            <circle cx="154" cy="140" r="7" fill="rgba(59,130,246,0.95)"/>
            <circle cx="132" cy="162" r="8" fill="rgba(255,215,0,0.95)"/>
            <circle cx="96" cy="188" r="7" fill="rgba(220,38,38,0.95)"/>
            <circle cx="170" cy="192" r="7" fill="rgba(34,197,94,0.95)"/>
            <circle cx="132" cy="210" r="7" fill="rgba(59,130,246,0.95)"/>

            <path d="M92 110c10-14 23-26 38-36-18 6-34 18-48 36z" fill="rgba(255,255,255,0.16)"/>
          </g>
        </svg>`
      ),
    // Right side is mirrored by the existing swayReverse animation.
    decoRightUrl:
      'data:image/svg+xml,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">
          <defs>
            <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="rgba(0,0,0,0.14)"/>
            </filter>
            <linearGradient id="tree" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#22c55e"/>
              <stop offset="1" stop-color="#15803d"/>
            </linearGradient>
            <linearGradient id="trunk" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#92400e"/>
              <stop offset="1" stop-color="#7c2d12"/>
            </linearGradient>
          </defs>
          <g filter="url(#s)">
            <path d="M130 20l10 20 22 3-16 15 4 22-20-10-20 10 4-22-16-15 22-3z" fill="rgba(255,215,0,0.95)"/>
            <path d="M130 52c-22 20-42 48-60 84h120c-18-36-38-64-60-84z" fill="url(#tree)"/>
            <path d="M130 86c-26 20-50 52-72 96h144c-22-44-46-76-72-96z" fill="url(#tree)"/>
            <path d="M130 124c-30 22-60 62-88 118h176c-28-56-58-96-88-118z" fill="url(#tree)"/>
            <path d="M118 214h24v36h-24z" fill="url(#trunk)"/>
            <path d="M122 214h8v36h-8z" fill="rgba(255,255,255,0.12)"/>

            <path d="M84 150c22 8 46 12 72 12s50-4 72-12" fill="none" stroke="rgba(255,255,255,0.40)" stroke-width="6" stroke-linecap="round"/>
            <path d="M92 178c18 7 39 10 62 10s44-3 62-10" fill="none" stroke="rgba(255,215,0,0.55)" stroke-width="5" stroke-linecap="round"/>
            <path d="M100 204c15 6 32 8 50 8s35-2 50-8" fill="none" stroke="rgba(220,38,38,0.45)" stroke-width="5" stroke-linecap="round"/>

            <circle cx="110" cy="128" r="7" fill="rgba(220,38,38,0.95)"/>
            <circle cx="154" cy="140" r="7" fill="rgba(59,130,246,0.95)"/>
            <circle cx="132" cy="162" r="8" fill="rgba(255,215,0,0.95)"/>
            <circle cx="96" cy="188" r="7" fill="rgba(220,38,38,0.95)"/>
            <circle cx="170" cy="192" r="7" fill="rgba(34,197,94,0.95)"/>
            <circle cx="132" cy="210" r="7" fill="rgba(59,130,246,0.95)"/>

            <path d="M92 110c10-14 23-26 38-36-18 6-34 18-48 36z" fill="rgba(255,255,255,0.16)"/>
          </g>
        </svg>`
      )
  },
  effects: {
    floatingItems: true,
    floatingPalette: {
      star: 'rgba(255, 215, 0, 0.55)',
      ornament: 'rgba(220, 38, 38, 0.50)',
      sparkle: 'rgba(255, 255, 255, 0.45)'
    }
  },
  colors: {
    pageBg: '#fff7f7',
    pageBgGradient:
      'radial-gradient(1200px 700px at 15% 10%, rgba(255, 215, 0, 0.18) 0%, rgba(255, 215, 0, 0.00) 58%), radial-gradient(900px 520px at 85% 25%, rgba(34, 197, 94, 0.14) 0%, rgba(34, 197, 94, 0.00) 60%), radial-gradient(900px 520px at 55% 95%, rgba(220, 38, 38, 0.12) 0%, rgba(220, 38, 38, 0.00) 62%), linear-gradient(135deg, #fff7f7 0%, #ffe4e6 45%, #fef2f2 100%)',
    title: '#7f1d1d',
    subtitle: '#991b1b',
    cardBorder: '#fecaca',
    cardShadow: 'rgba(127, 29, 29, 0.10)',
    accent: '#b91c1c',
    accentSoft: '#fee2e2',
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#dc2626',
    badgeOffline: '#dc2626',
    badgeSync: '#16a34a',
    tableRowBg: '#fff1f2',
    tableRowCardBg: 'rgba(255, 255, 255, 0.28)',
    tableRowCardBorder: 'rgba(255, 255, 255, 0.40)',
    tableHeader: '#991b1b',
    text: '#450a0a'
  }
};

export default christmasTheme;
