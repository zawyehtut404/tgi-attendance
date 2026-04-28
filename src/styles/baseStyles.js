export function makeStyles(theme) {
  const bgImage = theme.images?.pageBgUrl
    ? `url("${theme.images.pageBgUrl}")`
    : (theme.colors?.pageBgGradient || 'none');

  const glass = !!theme.effects?.glass;
  const bgShift = !!theme.effects?.bgShift && !!theme.colors?.pageBgGradient && !theme.images?.pageBgUrl;
  const bgShiftDurationSec = Number(theme.effects?.bgShiftDurationSec) || 18;
  const rowCardBg = theme.colors?.tableRowCardBg || theme.colors?.tableRowBg || '#ffffff';
  const rowCardBorder = theme.colors?.tableRowCardBorder || theme.colors?.cardBorder || 'rgba(0,0,0,0.08)';
  const dropdownSurfaceBg = rowCardBg;
  const dropdownSurfaceBorder = rowCardBorder;

  const glassSurface = glass
    ? {
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }
    : null;

  const cardSurface = glass
    ? glassSurface
    : {
        backgroundColor: '#fff',
        border: `1px solid ${theme.colors.cardBorder}`,
        boxShadow: `0 20px 40px ${theme.colors.cardShadow}`
      };

  const tableSurface = glass
    ? glassSurface
    : {
        backgroundColor: theme.colors.accentSoft,
        border: `1px solid ${theme.colors.cardBorder}`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
      };

  return {
    container: {
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: theme.colors.pageBg,
      backgroundImage: bgImage,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: bgShift ? '0% 50%' : 'center top',
      backgroundSize: bgShift ? '300% 300%' : 'cover',
      animation: bgShift ? `bgShift ${bgShiftDurationSec}s ease infinite` : 'none',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', sans-serif",
      position: 'relative',
      overflowX: 'hidden'
    },
    flowerLeft: {
      position: 'absolute',
      top: '-30px',
      left: '-5px',
      width: '200px',
      height: 'auto',
      zIndex: 1,
      pointerEvents: 'none',
      transformOrigin: 'top center'
    },
    flowerRight: {
      position: 'absolute',
      top: '-30px',
      right: '-5px',
      width: '200px',
      height: 'auto',
      zIndex: 1,
      pointerEvents: 'none',
      transformOrigin: 'top center'
    },
    floatingAlert: { position: 'fixed', top: '25px', padding: '16px 30px', borderRadius: '50px', color: '#fff', zIndex: 1000, fontWeight: '600', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
    success: { backgroundColor: theme.colors.success },
    warning: { backgroundColor: theme.colors.warning },
    error: { backgroundColor: theme.colors.error },
    header: { textAlign: 'center', marginBottom: '30px', zIndex: 5 },
    logoCircle: { width: '85px', height: '85px', borderRadius: '50%', backgroundColor: '#fff', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    logoImg: { width: '85%', height: 'auto' },
    mainTitle: { margin: 0, color: theme.colors.title, fontSize: '30px', fontWeight: '900' },
    subTitle: { margin: '5px 0 0', color: theme.colors.subtitle, fontWeight: '600', fontSize: '16px' },
    themeRow: { marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '16px', backgroundColor: theme.colors.accentSoft, border: `1px solid ${theme.colors.cardBorder}` },
    themeLabel: { fontSize: '12px', fontWeight: '800', color: theme.colors.subtitle, letterSpacing: '0.4px', textTransform: 'uppercase' },
    themeSelect: { border: `1px solid ${theme.colors.cardBorder}`, backgroundColor: '#fff', borderRadius: '12px', padding: '6px 10px', fontWeight: '700', color: theme.colors.text, cursor: 'pointer', outline: 'none' },
    clockContainer: {
      marginTop: '15px',
      padding: '12px 25px',
      borderRadius: '25px',
      ...(glass ? glassSurface : { backgroundColor: theme.colors.accentSoft, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', border: `1px solid ${theme.colors.cardBorder}` })
    },
    realTimeClock: { fontSize: '38px', fontWeight: '800', color: theme.colors.accent, letterSpacing: '1px' },
    realDate: { fontSize: '14px', color: theme.colors.title, fontWeight: '500', marginTop: '4px' },
    card: {
      padding: '30px 40px',
      backgroundColor: cardSurface.backgroundColor,
      borderRadius: '30px',
      width: '100%',
      maxWidth: '450px',
      marginBottom: '40px',
      boxShadow: cardSurface.boxShadow,
      // Keep the employee dropdown above the summary table when opened.
      zIndex: 20,
      border: cardSurface.border,
      ...(glass ? glassSurface : null)
    },
    inputGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: theme.colors.title },
    select: {
      width: '100%',
      padding: '16px',
      borderRadius: '18px',
      border: `2px solid ${theme.colors.cardBorder}`,
      fontSize: '16px',
      outline: 'none',
      cursor: 'pointer',
      backgroundColor: '#fff',
      ...(glass ? glassSurface : null)
    },
    dropdownRoot: { position: 'relative', width: '100%' },
    dropdownButton: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
      padding: '16px',
      borderRadius: '18px',
      border: `2px solid ${theme.colors.cardBorder}`,
      backgroundColor: dropdownSurfaceBg,
      color: theme.colors.text,
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '800',
      textAlign: 'left',
      ...(glass ? glassSurface : null)
    },
    dropdownValue: { color: theme.colors.text },
    dropdownPlaceholder: { color: theme.colors.subtitle, opacity: 0.8 },
    dropdownChevron: { opacity: 0.75, fontSize: '14px', fontWeight: '900' },
    dropdownList: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 'calc(100% + 10px)',
      maxHeight: '280px',
      overflow: 'auto',
      borderRadius: '18px',
      backgroundColor: dropdownSurfaceBg,
      border: `1px solid ${dropdownSurfaceBorder}`,
      boxShadow: '0 22px 60px rgba(15,23,42,0.18)',
      padding: '8px',
      zIndex: 2000,
      backdropFilter: glass ? 'blur(10px)' : 'none',
      WebkitBackdropFilter: glass ? 'blur(10px)' : 'none'
    },
    dropdownItem: {
      width: '100%',
      border: `1px solid transparent`,
      background: 'transparent',
      color: theme.colors.text,
      padding: '12px 12px',
      borderRadius: '14px',
      cursor: 'pointer',
      fontWeight: '800',
      textAlign: 'left'
    },
    dropdownItemActive: {
      background: theme.colors.accentSoft,
      border: `1px solid ${theme.colors.cardBorder}`
    },
    dropdownItemSelected: {
      border: `1px solid ${theme.colors.accent}`
    },
    downloadBtn: { width: '100%', backgroundColor: theme.colors.accent, color: '#fff', border: 'none', padding: '14px', borderRadius: '16px', cursor: 'pointer', fontWeight: '700', marginBottom: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.08)' },
    buttonGroup: { display: 'flex', gap: '15px' },
    button: { flex: 1, padding: '18px', color: '#fff', border: 'none', borderRadius: '18px', cursor: 'pointer', fontWeight: '700', fontSize: '16px' },
    btnIn: { backgroundColor: '#059669', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' },
    btnOut: { backgroundColor: '#b45309', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)' },
    tableCard: {
      width: '100%',
      maxWidth: '900px',
      backgroundColor: tableSurface.backgroundColor,
      padding: '30px',
      borderRadius: '32px',
      boxShadow: tableSurface.boxShadow,
      marginBottom: '40px',
      zIndex: 10,
      border: tableSurface.border,
      ...(glass ? glassSurface : null)
    },
    tableHeaderSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
    tableTitle: { margin: 0, fontSize: '20px', color: theme.colors.title, fontWeight: '700' },
    refreshBtn: { border: `1px solid ${theme.colors.cardBorder}`, background: theme.colors.accentSoft, color: theme.colors.title, padding: '10px 18px', borderRadius: '14px', cursor: 'pointer', fontWeight: '600' },
    tableWrapper: { overflowX: 'auto', paddingTop: '0px' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' },
    th: { textAlign: 'left', padding: '15px', color: theme.colors.tableHeader, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    tableRow: { transition: 'transform 0.2s' },
    td: { padding: '18px 15px', color: theme.colors.text, backgroundColor: rowCardBg, borderTop: `1px solid ${rowCardBorder}`, borderBottom: `1px solid ${rowCardBorder}` },
    tdFirst: { borderLeft: `1px solid ${rowCardBorder}`, borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' },
    tdLast: { borderRight: `1px solid ${rowCardBorder}`, borderTopRightRadius: '16px', borderBottomRightRadius: '16px' },
    inTime: { color: '#0ae8a2', fontWeight: '700' },
    outTime: { color: '#fa0808', fontWeight: '700' },
    durationBadge: { backgroundColor: theme.colors.accent, color: '#fff', padding: '6px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: '700' },
    lateBadge: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', border: '1px solid #fecaca' },
    onTimeBadge: { backgroundColor: '#d1fae5', color: '#059669', padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', border: '1px solid #a7f3d0' },
    emptyBadge: { color: '#d1d5db' },
    noData: { textAlign: 'center', padding: '50px', color: theme.colors.subtitle, fontStyle: 'italic' },
    footer: { marginTop: 'auto', padding: '30px 0', width: '100%', textAlign: 'center' },
    footerText: { color: theme.colors.accent, fontSize: '16px', fontWeight: '600', margin: '0 0 5px' },
    copytighttext: { color: theme.colors.subtitle, fontSize: '12px', fontWeight: '500', margin: '0 0 5px' },
    devText: { color: theme.colors.subtitle, fontSize: '14px', margin: 0, opacity: 0.8 },
    statusContainer: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 1000
    },
    offlineBadge: {
      backgroundColor: theme.colors.badgeOffline,
      color: '#fff',
      padding: '8px 16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '700',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
      animation: 'fadeInDown 0.4s ease-out'
    },
    syncBadge: {
      backgroundColor: theme.colors.badgeSync,
      color: '#fff',
      padding: '8px 16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '700',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
      animation: 'fadeInDown 0.4s ease-out'
    },
    syncDebugBtn: {
      border: '1px solid rgba(255,255,255,0.45)',
      background: 'rgba(255,255,255,0.15)',
      color: '#fff',
      padding: '4px 10px',
      borderRadius: '10px',
      cursor: 'pointer',
      fontWeight: '700',
      fontSize: '12px'
    },
    syncDebugPanel: {
      marginTop: '10px',
      background: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.22)',
      borderRadius: '12px',
      padding: '10px'
    },
    syncDebugRow: {
      display: 'flex',
      gap: '8px',
      marginBottom: '10px'
    },
    syncActionBtn: {
      flex: 1,
      border: '1px solid rgba(255,255,255,0.45)',
      background: 'rgba(255,255,255,0.15)',
      color: '#fff',
      padding: '8px 10px',
      borderRadius: '10px',
      cursor: 'pointer',
      fontWeight: '800',
      fontSize: '12px'
    },
    syncActionBtnDanger: {
      flex: 1,
      border: '1px solid rgba(255,255,255,0.45)',
      background: 'rgba(239,68,68,0.25)',
      color: '#fff',
      padding: '8px 10px',
      borderRadius: '10px',
      cursor: 'pointer',
      fontWeight: '800',
      fontSize: '12px'
    },
    syncDebugPre: {
      margin: 0,
      maxHeight: '260px',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      fontSize: '11px',
      lineHeight: 1.3,
      fontWeight: '600'
    }
  };
}
