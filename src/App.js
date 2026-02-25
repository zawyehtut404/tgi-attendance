import React, { useState, useEffect, useCallback } from 'react';

// --- Google Apps Script Configuration ---
const BASE_URL = "https://script.google.com/macros/s/AKfycbxZ3brn_-Z-TxRR2U9OicQWvRvAlouTs9Dh0UAkdBuPbGuQxYuZ7ddhCBHmhsG9prAU/exec";

function App() {
  const [employeeList, setEmployeeList] = useState([]);
  const [summaryRecords, setSummaryRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(new Date());

  // Real-time Clock Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeDisplay(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showAlert = useCallback((msg, type) => {
    setAlert({ show: true, message: msg, type: type });
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const empRes = await fetch(`${BASE_URL}?tab=Employees`);
      const empData = await empRes.json();
      setEmployeeList(Array.isArray(empData) ? empData : []);

      const attRes = await fetch(`${BASE_URL}?tab=Attendance`);
      const attData = await attRes.json();
      
      const todayStr = new Date().toLocaleDateString('en-GB');
      const filtered = Array.isArray(attData) ? attData.filter(r => r.Date === todayStr) : [];
      setSummaryRecords(filtered);
    } catch (err) {
      showAlert("Data ဆွဲယူ၍ မရပါ (GAS Connection Error)", "error");
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const calculateDuration = (inTime, outTime) => {
    if (!inTime || !outTime) return "-";
    try {
      const parseTime = (timeStr) => {
        const match = timeStr.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
        if (!match) return null;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const modifier = match[4];
        if (modifier) {
          if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
          if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d.getTime();
      };
      const startTime = parseTime(inTime);
      const endTime = parseTime(outTime);
      if (!startTime || !endTime) return "-";
      const diffMs = endTime - startTime;
      if (diffMs < 0) return "0h 0m";
      const totalMinutes = Math.floor(diffMs / 60000);
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${hrs}h ${mins}m`;
    } catch (e) { return "-"; }
  };

  const handleAttendance = async (actionType) => {
    if (!selectedName) { showAlert("ကျေးဇူးပြု၍ ဝန်ထမ်းအမည် ရွေးချယ်ပါ", "warning"); return; }
    setLoading(true);

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-GB');
    const timeForDB = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

    try {
      const res = await fetch(`${BASE_URL}?tab=Attendance`);
      const allRecords = await res.json();
      const existingRecord = allRecords.find(r => r.Name === selectedName && r.Date === todayStr);

      let payload = { Name: selectedName, Date: todayStr };

      if (actionType === 'ClockIn') {
        if (existingRecord && existingRecord.ClockIn) {
          showAlert(`${selectedName} သည် ယနေ့အတွက် Clock In လုပ်ပြီးပါပြီ`, "warning");
          setLoading(false);
          return;
        }
        payload.ClockIn = timeForDB;
        payload.action = "insert";
      } else {
        if (!existingRecord || !existingRecord.ClockIn) {
          showAlert("Clock In အရင်လုပ်ရန် လိုအပ်သည်", "warning");
          setLoading(false);
          return;
        }
        if (existingRecord.ClockOut) {
          showAlert("ယနေ့အတွက် Clock Out လုပ်ပြီးပါပြီ", "warning");
          setLoading(false);
          return;
        }
        payload.ClockOut = timeForDB;
        payload.Duration = calculateDuration(existingRecord.ClockIn, timeForDB);
        payload.action = "update";
      }

      await fetch(BASE_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      showAlert(`${selectedName} ${actionType === 'ClockIn' ? 'အလုပ်ဝင်ခြင်း' : 'အလုပ်ဆင်းခြင်း'} အောင်မြင်ပါသည်`, "success");
      setSelectedName('');
      setTimeout(() => fetchData(), 2000);
    } catch (error) {
      showAlert("ချိတ်ဆက်မှု အမှားအယွင်းရှိပါသည်", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadPersonalCSV = () => {
    if (!selectedName) { showAlert("ဝန်ထမ်းအမည် အရင်ရွေးချယ်ပါ", "warning"); return; }
    const personalRecord = summaryRecords.find(r => r.Name === selectedName);
    if (!personalRecord) { showAlert("မှတ်တမ်းမရှိသေးပါ", "warning"); return; }
    const headers = ["Name", "Date", "Clock In", "Clock Out", "Duration"];
    const row = [`"${personalRecord.Name}"`, `"${personalRecord.Date}"`, `"${personalRecord.ClockIn || '-'}"`, `"${personalRecord.ClockOut || '-'}"`, `"${personalRecord.Duration || '-'}"`];
    const csvContent = [headers.join(","), row.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${selectedName}_${personalRecord.Date}.csv`);
    link.click();
    showAlert("Download ရယူပြီးပါပြီ", "success");
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sway { 
          0% { transform: rotate(10deg); } 
          50% { transform: rotate(25deg); } 
          100% { transform: rotate(10deg); } 
        }
        @keyframes swayReverse { 
          0% { transform: scaleX(-1) rotate(10deg); } 
          50% { transform: scaleX(-1) rotate(25deg); } 
          100% { transform: scaleX(-1) rotate(10deg); } 
        }
        .alert-box { animation: fadeInDown 0.4s ease-out; }
        .flower-sway { animation: sway 5s ease-in-out infinite; }
        .flower-sway-reverse { animation: swayReverse 5s ease-in-out infinite; }
        button:hover { filter: brightness(1.1); transform: scale(1.02); transition: all 0.2s; }
        button:active { transform: scale(0.98); }
      `}</style>

      {/* သင်္ကြန်ပွဲတော် အလှဆင် ပိတောက်ပန်းများ */}
      <img 
        src="https://i.ibb.co/B2Zpj0bx/beautiful-yellow-padauk-flower-isolated-white-background-29544829-removebg-preview.png" 
        alt="Padauk Left" 
        className="flower-sway"
        style={styles.flowerLeft} 
      />
      <img 
        src="https://i.ibb.co/B2Zpj0bx/beautiful-yellow-padauk-flower-isolated-white-background-29544829-removebg-preview.png" 
        alt="Padauk Right" 
        className="flower-sway-reverse"
        style={styles.flowerRight} 
      />

      {alert.show && (
        <div className="alert-box" style={{ ...styles.floatingAlert, ...styles[alert.type] }}>
          {alert.type === 'success' ? '✅ ' : alert.type === 'warning' ? '⚠️ ' : '❌ '} {alert.message}
        </div>
      )}

      <div style={styles.header}>
        <div style={styles.logoCircle}>
          <img src="https://i.ibb.co/Gvb5m1p5/0b2cb75f-e9f1-43c1-aa40-4ea1b7b522f5-removebg-preview.png" alt="TGI Logo" style={styles.logoImg} />
        </div>
        <h1 style={styles.mainTitle}>TGI Attendance System</h1>
        <p style={styles.subTitle}>𝐓𝐡𝐢𝐧𝐠𝐲𝐚𝐧 𝐅𝐞𝐬𝐭𝐢𝐯𝐚𝐥 𝐄𝐝𝐢𝐭𝐢𝐨𝐧 💦</p>
        
        <div style={styles.clockContainer}>
          <div style={styles.realTimeClock}>
            {currentTimeDisplay.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div style={styles.realDate}>
            {currentTimeDisplay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>ဝန်ထမ်းအမည် ရွေးချယ်ရန်</label>
          <select value={selectedName} onChange={(e) => setSelectedName(e.target.value)} style={styles.select} disabled={loading}>
            <option value="">-- အမည်ရွေးပါ --</option>
            {employeeList.map((emp, i) => <option key={i} value={emp.Name}>{emp.Name}</option>)}
          </select>
        </div>
        
        <button onClick={downloadPersonalCSV} style={styles.downloadBtn} disabled={!selectedName || loading}>
          📥 Download My Record (.csv)
        </button>

        <div style={styles.buttonGroup}>
          <button onClick={() => handleAttendance('ClockIn')} style={{...styles.button, ...styles.btnIn}} disabled={loading}>Clock In</button>
          <button onClick={() => handleAttendance('ClockOut')} style={{...styles.button, ...styles.btnOut}} disabled={loading}>Clock Out</button>
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableHeaderSection}>
          <h3 style={styles.tableTitle}>ယနေ့မှတ်တမ်း (Daily Summary)</h3>
          <button onClick={fetchData} style={styles.refreshBtn} disabled={loading}>🔄 Refresh</button>
        </div>
        
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Clock In</th>
                <th style={styles.th}>Clock Out</th>
                <th style={styles.th}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {summaryRecords.length > 0 ? summaryRecords.map((r, i) => (
                <tr key={i} style={styles.tableRow}>
                  <td style={styles.td}><strong>{r.Name}</strong></td>
                  <td style={styles.td}><span style={styles.inTime}>{r.ClockIn || '-'}</span></td>
                  <td style={styles.td}><span style={styles.outTime}>{r.ClockOut || '-'}</span></td>
                  <td style={styles.td}><span style={r.Duration ? styles.durationBadge : styles.emptyBadge}>{r.Duration || '-'}</span></td>
                </tr>
              )) : (
                <tr><td colSpan="4" style={styles.noData}>ယနေ့အတွက် မှတ်တမ်းမရှိသေးပါ။</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer style={styles.footer}>
        <p style={styles.footerText}>Wishing you a happy Thingyan! 💦</p>
        <p style={styles.devText}>Dev by <strong>Htut</strong></p>
      </footer>
    </div>
  );
}

const styles = {
  container: { 
    padding: '40px 20px', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    backgroundColor: '#fffbeb', // ပန်းအဝါရောင်နဲ့ လိုက်ဖက်တဲ့ Cream အရောင်
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
  success: { backgroundColor: '#10b981' }, 
  warning: { backgroundColor: '#f59e0b' }, 
  error: { backgroundColor: '#ef4444' },
  header: { textAlign: 'center', marginBottom: '30px', zIndex: 5 },
  logoCircle: { width: '85px', height: '85px', borderRadius: '50%', backgroundColor: '#fff', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  logoImg: { width: '85%', height: 'auto' },
  mainTitle: { margin: 0, color: '#92400e', fontSize: '30px', fontWeight: '900' },
  subTitle: { margin: '5px 0 0', color: '#b45309', fontWeight: '600', fontSize: '16px' },
  clockContainer: { marginTop: '15px', padding: '12px 25px', borderRadius: '25px', backgroundColor: '#fef3c7', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' },
  realTimeClock: { fontSize: '38px', fontWeight: '800', color: '#d97706', letterSpacing: '1px' },
  realDate: { fontSize: '14px', color: '#92400e', fontWeight: '500', marginTop: '4px' },
  card: { padding: '30px 40px', backgroundColor: '#fff', borderRadius: '30px', width: '100%', maxWidth: '450px', marginBottom: '40px', boxShadow: '0 20px 40px rgba(146, 64, 14, 0.1)', zIndex: 5, border: '1px solid #fde68a' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: '#92400e' },
  select: { width: '100%', padding: '16px', borderRadius: '18px', border: '2px solid #fde68a', fontSize: '16px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' },
  downloadBtn: { width: '100%', backgroundColor: '#fbbf24', color: '#92400e', border: 'none', padding: '14px', borderRadius: '16px', cursor: 'pointer', fontWeight: '700', marginBottom: '25px', boxShadow: '0 4px 6px rgba(251, 191, 36, 0.2)' },
  buttonGroup: { display: 'flex', gap: '15px' },
  button: { flex: 1, padding: '18px', color: '#fff', border: 'none', borderRadius: '18px', cursor: 'pointer', fontWeight: '700', fontSize: '16px' },
  btnIn: { backgroundColor: '#059669', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' }, 
  btnOut: { backgroundColor: '#451a03', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)' },
  tableCard: { width: '100%', maxWidth: '900px', backgroundColor: '#fff', padding: '30px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', marginBottom: '40px', zIndex: 5, border: '1px solid #fef3c7' },
  tableHeaderSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  tableTitle: { margin: 0, fontSize: '20px', color: '#92400e', fontWeight: '700' },
  refreshBtn: { border: '1px solid #fde68a', background: '#fef3c7', color: '#92400e', padding: '10px 18px', borderRadius: '14px', cursor: 'pointer', fontWeight: '600' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' },
  th: { textAlign: 'left', padding: '15px', color: '#b45309', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableRow: { backgroundColor: '#fff9f2', transition: 'transform 0.2s' },
  td: { padding: '18px 15px', color: '#451a03', borderBottom: '1px solid #fef3c7' },
  inTime: { color: '#059669', fontWeight: '700' },
  outTime: { color: '#dc2626', fontWeight: '700' },
  durationBadge: { backgroundColor: '#fbbf24', color: '#92400e', padding: '6px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: '700' },
  emptyBadge: { color: '#d1d5db' },
  noData: { textAlign: 'center', padding: '50px', color: '#b45309', fontStyle: 'italic' },
  footer: { marginTop: 'auto', padding: '30px 0', width: '100%', textAlign: 'center' },
  footerText: { color: '#d97706', fontSize: '16px', fontWeight: '600', margin: '0 0 5px' },
  devText: { color: '#b45309', fontSize: '12px', margin: 0, opacity: 0.8 }
};

export default App;