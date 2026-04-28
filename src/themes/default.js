const defaultTheme = {
  key: 'default',
  label: 'Default',
  strings: {
    appTitle: 'TGI Attendance System',
    appSubtitle: 'Attendance',
    footerGreeting: 'Have a great day!',
    footerCopyright: '© 2026 TGI Japanese Language School. All rights reserved.',
    footerDev: 'Dev by Htut'
  },
  images: {
    logoUrl: 'https://i.ibb.co/Gvb5m1p5/0b2cb75f-e9f1-43c1-aa40-4ea1b7b522f5-removebg-preview.png',
    // Decorative images can be null for default theme.
    decoLeftUrl: null,
    decoRightUrl: null
  },
  effects: {
    floatingItems: false,
    glass: true,
    bgShift: true,
    bgShiftDurationSec: 45
  },
  colors: {
    pageBg: '#f6f7fb',
    pageBgGradient:
      'linear-gradient(237deg, #341470, #20975a, #390cc8, #f000d9, #189c34)',
    title: '#a5b9e8',
    subtitle: '#5b81b7',
    cardBorder: '#e5e7eb',
    cardShadow: 'rgba(15, 23, 42, 0.08)',
    accent: '#232d45',
    accentSoft: '#dbeafe',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    badgeOffline: '#ef4444',
    badgeSync: '#2563eb',
    tableRowBg: '#f8fafc',
    tableRowCardBg: 'rgba(255, 255, 255, 0.22)',
    tableRowCardBorder: 'rgba(255, 255, 255, 0.35)',
    tableHeader: '#334155',
    text: '#c5c6c9'
  }
};

export default defaultTheme;
