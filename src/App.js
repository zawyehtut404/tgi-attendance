import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://api.sheetbest.com/sheets/e3c8d134-2498-4fcd-8fb6-cd7c80f4e85f/tabs/Attendance";
const EMP_URL = "https://api.sheetbest.com/sheets/e3c8d134-2498-4fcd-8fb6-cd7c80f4e85f/tabs/Employees";

function App() {
  const [employeeList, setEmployeeList] = useState([]);
  const [summaryRecords, setSummaryRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  
  // Real-time Clock State
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(new Date());

  // Clock Update Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeDisplay(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empRes = await axios.get(EMP_URL);
      const attRes = await axios.get(API_URL);
      setEmployeeList(empRes.data);
      const todayStr = new Date().toLocaleDateString('en-GB');
      setSummaryRecords(attRes.data.filter(r => r.Date === todayStr));
    } catch (err) {
      showAlert("Data ဆွဲယူ၍ မရပါ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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

  const showAlert = (msg, type) => {
    setAlert({ show: true, message: msg, type: type });
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 4000);
  };

  const handleAttendance = async (actionType) => {
    if (!selectedName) { showAlert("ကျေးဇူးပြု၍ ဝန်ထမ်းအမည် ရွေးချယ်ပါ", "warning"); return; }
    setLoading(true);

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-GB');
    // Database ထဲသို့ ထည့်မည့်အချိန် (AM/PM format)
    const timeForDB = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

    try {
      const checkRes = await axios.get(API_URL);
      const allRecords = checkRes.data;
      const existingIdx = allRecords.findIndex(r => r.Name === selectedName && r.Date === todayStr);
      const existingRecord = existingIdx !== -1 ? allRecords[existingIdx] : null;

      if (actionType === 'ClockIn') {
        if (existingRecord && existingRecord.ClockIn) {
          showAlert(`${selectedName} သည် ယနေ့အတွက် Clock In လုပ်ပြီးပါပြီ`, "warning");
          setLoading(false);
          return;
        }
      }

      if (actionType === 'ClockOut') {
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
      }

      if (existingIdx !== -1) {
        let updateData = {};
        if (actionType === 'ClockOut') {
          const duration = calculateDuration(existingRecord.ClockIn, timeForDB);
          updateData = { ClockOut: `'${timeForDB}`, Duration: `'${duration}` };
        } else {
          updateData = { ClockIn: `'${timeForDB}` };
        }
        await axios.patch(`${API_URL}/${existingIdx}`, updateData);
      } else {
        await axios.post(API_URL, {
          Name: selectedName, 
          Date: `'${todayStr}`,
          ClockIn: actionType === 'ClockIn' ? `'${timeForDB}` : '',
          ClockOut: actionType === 'ClockOut' ? `'${timeForDB}` : '',
          Duration: ''
        });
      }

      showAlert(`${selectedName} ${actionType === 'ClockIn' ? 'အလုပ်ဝင်ခြင်း' : 'အလုပ်ဆင်းခြင်း'} အောင်မြင်ပါသည်`, "success");
      setSelectedName('');
      fetchData();
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
          <img src="https://postimage.me/images/2026/01/09/0b2cb75f-e9f1-43c1-aa40-4ea1b7b522f5-removebg-preview.png" alt="TGI Logo" style={styles.logoImg} />
        </div>
        <h1 style={styles.mainTitle}>TGI Attendance System</h1>
        
        {/* Real-time Clock UI */}
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
    </div>
  );
}

const styles = {
  container: { padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f0f4f8', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" },
  floatingAlert: { position: 'fixed', top: '25px', padding: '16px 30px', borderRadius: '50px', color: '#fff', zIndex: 1000, fontWeight: '600', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  success: { backgroundColor: '#10b981' }, warning: { backgroundColor: '#f59e0b' }, error: { backgroundColor: '#ef4444' },
  header: { textAlign: 'center', marginBottom: '30px' },
  logoCircle: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fff', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  logoImg: { width: '100%', height: 'auto' },
  mainTitle: { margin: 0, color: '#1e293b', fontSize: '28px', fontWeight: '800' },
  
  // Clock Styles
  clockContainer: { marginTop: '15px', padding: '10px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.5)' },
  realTimeClock: { fontSize: '36px', fontWeight: '700', color: '#3b82f6', letterSpacing: '2px' },
  realDate: { fontSize: '14px', color: '#64748b', fontWeight: '500', marginTop: '5px' },

  card: { padding: '30px 40px', backgroundColor: '#fff', borderRadius: '28px', width: '100%', maxWidth: '450px', marginBottom: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.04)' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: '#475569' },
  select: { width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '16px', outline: 'none' },
  downloadBtn: { width: '100%', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', marginBottom: '25px', transition: '0.3s' },
  buttonGroup: { display: 'flex', gap: '15px' },
  button: { flex: 1, padding: '18px', color: '#fff', border: 'none', borderRadius: '16px', cursor: 'pointer', fontWeight: '700', transition: '0.3s' },
  btnIn: { backgroundColor: '#10b981' }, btnOut: { backgroundColor: '#f43f5e' },
  tableCard: { width: '100%', maxWidth: '900px', backgroundColor: '#fff', padding: '30px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' },
  tableHeaderSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  tableTitle: { margin: 0, fontSize: '20px', color: '#1e293b' },
  refreshBtn: { border: '1px solid #e2e8f0', background: '#fff', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' },
  th: { textAlign: 'left', padding: '15px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' },
  tableRow: { backgroundColor: '#f8fafc' },
  td: { padding: '18px 15px', color: '#334155' },
  inTime: { color: '#059669', fontWeight: '700' },
  outTime: { color: '#e11d48', fontWeight: '700' },
  durationBadge: { backgroundColor: '#3b82f6', color: '#fff', padding: '6px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600' },
  emptyBadge: { color: '#cbd5e1' },
  noData: { textAlign: 'center', padding: '50px', color: '#94a3b8' }
};

export default App;