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
      {/* သင်္ကြန်ပွဲတော် အလှဆင် ပိတောက်ပန်းများ */}
      <img 
        src="https://i.ibb.co/Rp5Q15X9/pngimg-com-chinese-new-year-PNG39.png" 
        alt="Padauk Left" 
        style={styles.flowerLeft} 
      />
      <img 
        src="https://i.ibb.co/Rp5Q15X9/pngimg-com-chinese-new-year-PNG39.png" 
        alt="Padauk Right" 
        style={styles.flowerRight} 
      />

      <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sway { 0% { transform: rotate(15deg); } 50% { transform: rotate(20deg); } 100% { transform: rotate(15deg); } }
        @keyframes swayReverse { 0% { transform: scaleX(-1) rotate(15deg); } 50% { transform: scaleX(-1) rotate(20deg); } 100% { transform: scaleX(-1) rotate(15deg); } }
        .alert-box { animation: fadeInDown 0.4s ease-out; }
        button:hover { filter: brightness(1.1); transform: translateY(-1px); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

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
        <p style={styles.footerText}>Dev by <strong>Htut</strong></p>
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
    backgroundColor: '#923636', 
    minHeight: '100vh', 
    fontFamily: "'Segoe UI', sans-serif",
    position: 'relative',
    overflowX: 'hidden'
  },
  flowerLeft: {
    position: 'absolute',
    top: '-20px',
    left: '-20px',
    width: '180px',
    height: 'auto',
    zIndex: 10,
    animation: 'sway 4s ease-in-out infinite',
    pointerEvents: 'none'
  },
  flowerRight: {
    position: 'absolute',
    top: '-20px',
    right: '-20px',
    width: '180px',
    height: 'auto',
    zIndex: 10,
    animation: 'swayReverse 4s ease-in-out infinite',
    pointerEvents: 'none'
  },
  floatingAlert: { position: 'fixed', top: '25px', padding: '16px 30px', borderRadius: '50px', color: '#fff', zIndex: 1000, fontWeight: '600', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  success: { backgroundColor: '#10b981' }, 
  warning: { backgroundColor: '#f59e0b' }, 
  error: { backgroundColor: '#ef4444' },
  header: { textAlign: 'center', marginBottom: '30px' },
  logoCircle: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fff', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  logoImg: { width: '100%', height: 'auto' },
  mainTitle: { margin: 0, color: '#ffffff', fontSize: '28px', fontWeight: '800' },
  clockContainer: { marginTop: '15px', padding: '10px', borderRadius: '20px', backgroundColor: '#935555' },
  realTimeClock: { fontSize: '36px', fontWeight: '700', color: '#3b82f6', letterSpacing: '2px' },
  realDate: { fontSize: '14px', color: '#5f9bef', fontWeight: '500', marginTop: '5px' },
  card: { padding: '30px 40px', backgroundColor: '#935555', borderRadius: '28px', width: '100%', maxWidth: '450px', marginBottom: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.04)', zIndex: 5 },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: '#e2ecf9' },
  select: { width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '16px', outline: 'none' },
  downloadBtn: { width: '100%', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', marginBottom: '25px' },
  buttonGroup: { display: 'flex', gap: '15px' },
  button: { flex: 1, padding: '18px', color: '#ffffff', border: 'none', borderRadius: '16px', cursor: 'pointer', fontWeight: '700' },
  btnIn: { backgroundColor: '#10b981' }, 
  btnOut: { backgroundColor: '#f43f5e' },
  tableCard: { width: '100%', maxWidth: '900px', backgroundColor: '#935555', padding: '30px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', marginBottom: '40px', zIndex: 5 },
  tableHeaderSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  tableTitle: { margin: 0, fontSize: '20px', color: '#b3c7e6' },
  refreshBtn: { border: '1px solid #e2e8f0', background: '#fff', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' },
  th: { textAlign: 'left', padding: '15px', color: '#f3f5f8', fontSize: '12px', textTransform: 'uppercase' },
  tableRow: { backgroundColor: '#935555' },
  td: { padding: '18px 15px', color: '#ffffff' },
  inTime: { color: '#9bd7c4', fontWeight: '700' },
  outTime: { color: '#e11d48', fontWeight: '700' },
  durationBadge: { backgroundColor: '#3b82f6', color: '#fff', padding: '6px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600' },
  emptyBadge: { color: '#cbd5e1' },
  noData: { textAlign: 'center', padding: '50px', color: '#94a3b8' },
  footer: { marginTop: 'auto', padding: '20px 0', width: '100%', textAlign: 'center' },
  footerText: { color: '#94a3b8', fontSize: '14px', margin: 0, letterSpacing: '0.5px' }
};

export default App;