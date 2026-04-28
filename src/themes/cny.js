const cnyTheme = {
  key: 'cny',
  label: 'Chinese New Year',
  strings: {
    appTitle: 'TGI Attendance System',
    appSubtitle: 'Chinese New Year Edition',
    footerGreeting: 'Happy Chinese New Year!',
    footerCopyright: '© 2026 TGI Japanese Language School. All rights reserved.',
    footerDev: 'Dev by Htut'
  },
  images: {
    logoUrl: 'https://i.ibb.co/Gvb5m1p5/0b2cb75f-e9f1-43c1-aa40-4ea1b7b522f5-removebg-preview.png',
    decoLeftUrl: 'https://i.ibb.co/Rp5Q15X9/pngimg-com-chinese-new-year-PNG39.png',
    decoRightUrl: 'https://i.ibb.co/Rp5Q15X9/pngimg-com-chinese-new-year-PNG39.png'
  },
  effects: {
    floatingItems: true,
    floatingVariant: 'cny',
    floatingPalette: {
      lantern: 'rgba(220, 38, 38, 0.50)',
      gold: 'rgba(255, 215, 0, 0.55)',
      cloud: 'rgba(255, 255, 255, 0.28)',
      coinStroke: 'rgba(154, 52, 18, 0.42)'
    }
  },
  colors: {
    // Gradient inspired by the CNY lantern/red-gold palette.
    pageBg: '#fff7ed',
    pageBgGradient: 'radial-gradient(1200px 600px at 10% 10%, rgba(255, 215, 0, 0.22) 0%, rgba(255, 215, 0, 0.00) 55%), radial-gradient(900px 500px at 90% 20%, rgba(220, 38, 38, 0.18) 0%, rgba(220, 38, 38, 0.00) 60%), linear-gradient(135deg, #fff7ed 0%, #ffedd5 40%, #fee2e2 100%)',
    title: '#9a3412',
    subtitle: '#c2410c',
    cardBorder: '#fed7aa',
    cardShadow: 'rgba(154, 52, 18, 0.10)',
    accent: '#ea580c',
    accentSoft: '#ffedd5',
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#dc2626',
    badgeOffline: '#dc2626',
    badgeSync: '#ea580c',
    tableRowBg: '#fffbf5',
    tableRowCardBg: 'rgba(255, 255, 255, 0.26)',
    tableRowCardBorder: 'rgba(255, 255, 255, 0.40)',
    tableHeader: '#c2410c',
    text: '#431407'
  }
};

export default cnyTheme;
