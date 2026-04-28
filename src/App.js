import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { themes, getTheme, THEME_STORAGE_KEY } from './themes';
import { makeStyles } from './styles/baseStyles';
import FloatingItemsBackdrop from './components/FloatingItemsBackdrop';
import EmployeeSelect from './components/EmployeeSelect';

// --- API Configuration ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyflN9H_ItSROdpdhQLwryFkE8zBWINmmXi4r8PldKvFClTuvM0u4QPBp8yCILyihRC/exec";

const getTabName = () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthIdx = now.getMonth(); // 0-11 (March is 2)

  // ၂၀၂၆ မတ်လအတွက် "Attendance" ကိုသုံးပြီး ကျန်တဲ့လတွေအတွက် Jan, Feb, Apr စသဖြင့် သုံးပါမည်
  if (year === 2026 && monthIdx === 2) {
    return "Attendance";
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[monthIdx];
};

const ATTENDANCE_TAB = getTabName();
const EMPLOYEE_CACHE_KEY = 'attendance_employees';
const SUMMARY_CACHE_KEY = 'attendance_summary';
const CACHE_META_KEY = 'attendance_cache_meta';
const FETCH_TTL_MS = 5 * 60 * 1000;

function App() {
  const [themeKey, setThemeKey] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved && themes[saved] ? saved : 'thingyan';
  });
  const theme = useMemo(() => getTheme(themeKey), [themeKey]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const themeAdminEnabled = useMemo(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      return qs.get('themeAdmin') === '1';
    } catch (e) {
      return false;
    }
  }, []);

  const [employeeList, setEmployeeList] = useState([]);
  const [summaryRecords, setSummaryRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(new Date());

  // --- Offline & Sync States ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    const saved = localStorage.getItem('attendance_offline_queue');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const hasFetchedOnMount = useRef(false);
  const syncInFlightRef = useRef(false);
  const offlineQueueRef = useRef(offlineQueue);
  const syncRetryTimerRef = useRef(null);
  const lastSyncAttemptAtRef = useRef(0);
  const [showSyncDebug, setShowSyncDebug] = useState(false);
  const telegramDisabledRef = useRef(false);
  const telegramWarnedRef = useRef(false);

  const getTodayString = () => new Date().toLocaleDateString('en-GB');

  const normalizeSheetDate = (v) => (v ? v.toString().replace(/'/g, "").trim() : "");

  const normalizeTimeValue = (v) => {
    if (!v) return "";

    // Apps Script used to return Date objects for time-only cells; after JSON stringify they look like ISO.
    // Example: 1899-12-29T18:59:13.000Z. Convert those to a human time string.
    if (v instanceof Date && !isNaN(v.getTime())) {
      return v.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const s = v.toString().replace(/'/g, "").trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/i.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    }

    return s;
  };

  const employeeOptions = useMemo(() => {
    return employeeList.map((emp) => ({ value: emp.Name, label: emp.Name }));
  }, [employeeList]);

  useEffect(() => {
    offlineQueueRef.current = offlineQueue;
  }, [offlineQueue]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
  }, [themeKey]);

  useEffect(() => {
    return () => {
      if (syncRetryTimerRef.current) {
        clearTimeout(syncRetryTimerRef.current);
        syncRetryTimerRef.current = null;
      }
    };
  }, []);

  const postToScript = useCallback(async (payload) => {
    const response = await axios.post(SCRIPT_URL, JSON.stringify(payload), {
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      timeout: 15000
    });

    if (response.data && response.data.ok === false) {
      throw new Error(response.data.error || 'Apps Script request failed');
    }

    return response.data;
  }, []);

  const fetchSheetRows = useCallback(async (tabName) => {
    const response = await axios.get(SCRIPT_URL, {
      params: { tab: tabName },
      timeout: 15000
    });
    if (response.data && response.data.ok === false) {
      throw new Error(response.data.error || 'Apps Script fetch failed');
    }
    return Array.isArray(response.data?.data) ? response.data.data : [];
  }, []);

  const appendSheetRow = useCallback(async (tabName, record) => {
    return postToScript({
      action: 'append',
      tab: tabName,
      record
    });
  }, [postToScript]);

  const updateSheetRowByMatch = useCallback(async (tabName, match, updateData) => {
    return postToScript({
      action: 'updateByMatch',
      tab: tabName,
      match,
      updateData
    });
  }, [postToScript]);

  const sendTelegramMessage = useCallback(async (message) => {
    return postToScript({
      action: 'sendTelegram',
      message
    });
  }, [postToScript]);

  const loadCachedData = useCallback(() => {
    const todayStr = getTodayString();
    const cachedEmps = localStorage.getItem(EMPLOYEE_CACHE_KEY);
    const cachedSummary = localStorage.getItem(SUMMARY_CACHE_KEY);

    if (cachedEmps) {
      setEmployeeList(JSON.parse(cachedEmps));
    }

    if (cachedSummary) {
      const parsed = JSON.parse(cachedSummary);
      const filtered = parsed.filter(r => {
        const rowDate = normalizeSheetDate(r.Date);
        return rowDate === todayStr;
      });
      const normalized = filtered.map(r => ({
        ...r,
        Date: normalizeSheetDate(r.Date),
        ClockIn: normalizeTimeValue(r.ClockIn),
        ClockOut: normalizeTimeValue(r.ClockOut)
      }));
      setSummaryRecords(normalized);
    }
  }, []);

  // Real-time Clock Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeDisplay(new Date());
    }, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showAlert = useCallback((msg, type) => {
    setAlert({ show: true, message: msg, type: type });
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 4000);
  }, []);

  // Data Fetching
  const fetchData = useCallback(async (forceRefresh = false) => {
    const todayStr = getTodayString();
    const cacheMeta = localStorage.getItem(CACHE_META_KEY);

    if (!forceRefresh && cacheMeta) {
      try {
        const parsedMeta = JSON.parse(cacheMeta);
        const isFresh = parsedMeta.fetchedAt && (Date.now() - parsedMeta.fetchedAt < FETCH_TTL_MS);
        if (isFresh) {
          loadCachedData();
          return;
        }
      } catch (e) {
        console.error("Cache meta parse error:", e);
      }
    }

    setLoading(true);
    try {
      const employees = await fetchSheetRows('Employees');
      const attendanceRows = await fetchSheetRows(ATTENDANCE_TAB);

      setEmployeeList(employees);
      localStorage.setItem(EMPLOYEE_CACHE_KEY, JSON.stringify(employees));

      const normalizedRows = attendanceRows.map(r => ({
        ...r,
        Date: normalizeSheetDate(r.Date),
        ClockIn: normalizeTimeValue(r.ClockIn),
        ClockOut: normalizeTimeValue(r.ClockOut)
      }));

      const filtered = normalizedRows.filter(r => r.Date === todayStr);
      setSummaryRecords(filtered);
      localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(normalizedRows));
      localStorage.setItem(CACHE_META_KEY, JSON.stringify({ fetchedAt: Date.now() }));
    } catch (err) {
      // Load from cache if API fails
      loadCachedData();
      
      // Cache ထဲက data ဖြစ်ဖြစ် ရောက်လာတဲ့ data ဖြစ်ဖြစ် ဒီနေ့အတွက်ပဲ filter လုပ်မယ်

      if (!navigator.onLine) {
        showAlert("Offline Mode - Local data ကို ပြသနေပါသည်", "warning");
      } else {
        // 404 Error (Missing tab) ဆိုရင် Offline အတိုင်း အလုပ်လုပ်နိုင်ဖို့ warning ပေးမယ်
        showAlert("Server နှင့် ချိတ်ဆက်မရပါ (Offline အတိုင်း ဆက်လက်သုံးစွဲနိုင်ပြီး WiFi ပြန်ရလာလျှင် Sync လုပ်ပေးပါမည်)", "warning");
      }
    } finally {
      setLoading(false);
    }
  }, [fetchSheetRows, loadCachedData, showAlert]);

  useEffect(() => {
    if (hasFetchedOnMount.current) {
      return;
    }

    hasFetchedOnMount.current = true;
    fetchData();
  }, [fetchData]);

  const calculateDuration = (inTime, outTime) => {
    if (!inTime || !outTime) return "-";
    try {
      const parseTime = (timeStr) => {
        const cleanTime = timeStr.replace(/'/g, ""); // အရှေ့က code အရ ' ပါခဲ့ရင် ဖယ်ရန်
        const match = cleanTime.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
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
        return d;
      };

      const inDate = parseTime(inTime);
      const outDate = parseTime(outTime);
      if (!inDate || !outDate) return "-";

      // 9:01 AM Cutoff for duration start
      const cutoffDate = new Date(inDate);
      cutoffDate.setHours(9, 1, 0, 0);

      // စောရောက်ရင် ၉ နာရီ ၀၁ မိနစ်ကနေစတွက်မယ်၊ နောက်ကျရင် ရောက်တဲ့အချိန်ကနေ တွက်မယ်
      const effectiveStartDate = inDate < cutoffDate ? cutoffDate : inDate;
      const startTime = effectiveStartDate.getTime();
      const endTime = outDate.getTime();

      const diffMs = endTime - startTime;
      if (diffMs < 0) return "0h 0m";
      const totalMinutes = Math.floor(diffMs / 60000);
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${hrs}h ${mins}m`;
    } catch (e) { return "-"; }
  };

  const sendTelegramNotification = useCallback(async (name, action, time, status = "") => {
    if (telegramDisabledRef.current) return;
    try {
      let message = `⏰ ${name} - ${action === 'ClockIn' ? 'Clock In လုပ်လိုက်ပါပြီ' : 'Clock Out လုပ်လိုက်ပါပြီ'}\n`;
      message += `🕒 အချိန်: ${time}\n`;
      if (status) message += `📝 Status: ${status}`;
      await sendTelegramMessage(message);
    } catch (error) {
      console.error("Telegram error:", error);
      const msg = error?.message || "";
      if (msg.includes("Telegram properties are missing")) {
        telegramDisabledRef.current = true;
        if (!telegramWarnedRef.current) {
          telegramWarnedRef.current = true;
          showAlert("Telegram setting မထည့်ထားသေးပါ (Bot token/chat id). Telegram ပို့ခြင်းကို ပိတ်ထားပါမည်", "warning");
        }
      }
    }
  }, [sendTelegramMessage, showAlert]);

  const normalizeDate = (v) => (v ? v.toString().replace(/'/g, "").trim() : "");
  const getQueueKey = (type, name, date) => `${type}|${(name || "").trim()}|${normalizeDate(date)}`;

  // --- Sync Offline Data ---
  const syncOfflineRecords = useCallback(async () => {
    const queueNow = offlineQueueRef.current || [];
    if (queueNow.length === 0 || isSyncing || !navigator.onLine || syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    setIsSyncing(true);
    try {
      const queue = [...queueNow];
      const failedIndices = [];

    for (let i = 0; i < queue.length; i++) {
      const record = queue[i];
      try {
        if (record.type === 'new') {
          await appendSheetRow(ATTENDANCE_TAB, record.data);
          // Sync ပြီးရင် Notification ပို့မယ်
          const cleanTime = record.data.ClockIn.replace(/'/g, "");
          await sendTelegramNotification(record.data.Name, 'ClockIn', cleanTime, record.data.Status);
        } else if (record.type === 'update') {
          // Don't depend on a preload fetch for matching; just attempt updateByMatch.
          // Also try both date formats (with/without leading apostrophe) to avoid "pending forever"
          // when sheet/script normalizes values differently.
          const name = record.data?.Name;
          const rawDate = record.data?.Date;
          const cleanDate = normalizeDate(rawDate);

          let updated = false;
          try {
            await updateSheetRowByMatch(ATTENDANCE_TAB, { Name: name, Date: rawDate }, record.updateData);
            updated = true;
          } catch (e1) {
            try {
              await updateSheetRowByMatch(ATTENDANCE_TAB, { Name: name, Date: cleanDate }, record.updateData);
              updated = true;
            } catch (e2) {
              // keep pending
              record.lastError = e2?.message || e1?.message || 'Update failed';
              record.lastTriedAt = Date.now();
            }
          }

          if (updated) {
            const cleanTime = record.updateData.ClockOut.replace(/'/g, "");
            await sendTelegramNotification(record.data.Name, 'ClockOut', cleanTime);
          } else {
            failedIndices.push(i);
          }
        }
      } catch (e) {
        console.error("Sync error for item", i, e);
        record.lastError = e?.message || 'Sync failed';
        record.lastTriedAt = Date.now();
        failedIndices.push(i);
      }
    }

    const newQueue = failedIndices.map(idx => queue[idx]);
    setOfflineQueue(newQueue);
    localStorage.setItem('attendance_offline_queue', JSON.stringify(newQueue));
    

    if (failedIndices.length === 0) {
      showAlert("Offline မှတ်တမ်းအားလုံး Sync လုပ်ပြီးပါပြီ", "success");
      fetchData(true);
      if (syncRetryTimerRef.current) {
        clearTimeout(syncRetryTimerRef.current);
        syncRetryTimerRef.current = null;
      }
    } else {
      showAlert(`Sync မပြီးသေးပါ။ Pending ${failedIndices.length} ခု ကျန်နေပါတယ်`, "warning");
      // Avoid tight retry loops when server/tab/match keeps failing.
      if (!syncRetryTimerRef.current) {
        syncRetryTimerRef.current = setTimeout(() => {
          syncRetryTimerRef.current = null;
          // Only retry if we're still online and queue still has items.
          if (navigator.onLine && (offlineQueueRef.current || []).length > 0) {
            syncOfflineRecords();
          }
        }, 30000);
      }
    }
    } finally {
      setIsSyncing(false);
      syncInFlightRef.current = false;
    }
  }, [appendSheetRow, fetchData, isSyncing, sendTelegramNotification, showAlert, updateSheetRowByMatch]);

  useEffect(() => {
    if (!isOnline) return;
    if (offlineQueue.length === 0) return;

    // Debounce sync attempts so queue updates don't cause immediate re-sync loops.
    const MIN_GAP_MS = 3000;
    const now = Date.now();
    const waitMs = Math.max(0, MIN_GAP_MS - (now - lastSyncAttemptAtRef.current));

    const t = setTimeout(() => {
      lastSyncAttemptAtRef.current = Date.now();
      syncOfflineRecords();
    }, waitMs);

    return () => clearTimeout(t);
  }, [isOnline, offlineQueue.length, syncOfflineRecords]);

  const handleAttendance = async (actionType) => {
    if (!selectedName) { showAlert("ကျေးဇူးပြု၍ ဝန်ထမ်းအမည် ရွေးချယ်ပါ", "warning"); return; }
    setLoading(true);

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-GB');
    const timeForDB = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

    // 9:01 AM Cutoff for Late marking and duration start
    const cutoff = new Date(now);
    cutoff.setHours(9, 1, 0, 0);
    const isLateStatus = now > cutoff ? 'Late' : 'On Time';
    const existingSummaryRecord = summaryRecords.find(r => r.Name === selectedName);

    const updateSummaryImmediately = () => {
      const updatedSummary = [...summaryRecords];
      const summaryIdx = updatedSummary.findIndex(r => r.Name === selectedName);

      if (summaryIdx !== -1) {
        if (actionType === 'ClockIn') {
          updatedSummary[summaryIdx] = {
            ...updatedSummary[summaryIdx],
            ClockIn: timeForDB,
            Status: isLateStatus
          };
        } else {
          updatedSummary[summaryIdx] = {
            ...updatedSummary[summaryIdx],
            ClockOut: timeForDB,
            Duration: calculateDuration(updatedSummary[summaryIdx].ClockIn, timeForDB)
          };
        }
      } else {
        updatedSummary.push({
          Name: selectedName,
          Date: todayStr,
          ClockIn: actionType === 'ClockIn' ? timeForDB : '',
          ClockOut: actionType === 'ClockOut' ? timeForDB : '',
          Duration: '',
          Status: isLateStatus
        });
      }

      setSummaryRecords(updatedSummary);
      localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(updatedSummary));
      localStorage.setItem(CACHE_META_KEY, JSON.stringify({ fetchedAt: Date.now() }));
    };

    const saveOffline = () => {
      const offlineRecord = {
        type: '',
        data: { Name: selectedName, Date: `'${todayStr}` },
        timestamp: now.getTime()
      };

      if (actionType === 'ClockIn') {
        if (existingSummaryRecord && existingSummaryRecord.ClockIn) {
          showAlert(`${selectedName} သည် ယနေ့အတွက် Clock In လုပ်ပြီးပါပြီ`, "warning");
          setLoading(false);
          return;
        }
        offlineRecord.type = 'new';
        offlineRecord.data.ClockIn = `'${timeForDB}`;
        offlineRecord.data.ClockOut = '';
        offlineRecord.data.Duration = '';
        offlineRecord.data.Status = isLateStatus;
      } else { // ClockOut
        if (!existingSummaryRecord || !existingSummaryRecord.ClockIn) {
          showAlert("Clock In အရင်လုပ်ရန် လိုအပ်သည်", "warning");
          setLoading(false);
          return;
        }
        if (existingSummaryRecord.ClockOut) {
          showAlert("ယနေ့အတွက် Clock Out လုပ်ပြီးပါပြီ", "warning");
          setLoading(false);
          return;
        }
        offlineRecord.type = 'update';
        const duration = calculateDuration(existingSummaryRecord.ClockIn, timeForDB);
        offlineRecord.updateData = { ClockOut: `'${timeForDB}`, Duration: `'${duration}` };
        offlineRecord.data.Name = selectedName;
        offlineRecord.data.Date = `'${todayStr}`;
      }

      // Prevent duplicate pending items (e.g. double-click / refresh / flaky connectivity).
      const existingKeys = new Set((offlineQueueRef.current || []).map(r => getQueueKey(r.type, r?.data?.Name, r?.data?.Date)));
      const newKey = getQueueKey(offlineRecord.type, offlineRecord?.data?.Name, offlineRecord?.data?.Date);
      let newQueue = [...(offlineQueueRef.current || [])];

      if (existingKeys.has(newKey)) {
        // For updates, keep the latest updateData (latest clock-out time wins).
        if (offlineRecord.type === 'update') {
          newQueue = newQueue.map(r => {
            if (getQueueKey(r.type, r?.data?.Name, r?.data?.Date) === newKey) {
              return { ...r, updateData: offlineRecord.updateData, timestamp: offlineRecord.timestamp };
            }
            return r;
          });
        }
      } else {
        newQueue.push(offlineRecord);
      }
      setOfflineQueue(newQueue);
      localStorage.setItem('attendance_offline_queue', JSON.stringify(newQueue));

      updateSummaryImmediately();

      showAlert(`${selectedName} ကို Local မှာ မှတ်သားထားပါသည် (WiFi ပြန်ကောင်းလာလျှင် Auto Sync လုပ်ပေးပါမည်)`, "warning");
      setSelectedName('');
      setLoading(false);
    };

    // Handle Offline Case or API Failure
    if (!isOnline) {
      saveOffline();
      return;
    }

    try {
      if (actionType === 'ClockIn') {
        if (existingSummaryRecord && existingSummaryRecord.ClockIn) {
          showAlert(`${selectedName} သည် ယနေ့အတွက် Clock In လုပ်ပြီးပါပြီ`, "warning");
          setLoading(false);
          return;
        }
      } else {
        if (!existingSummaryRecord || !existingSummaryRecord.ClockIn) {
          showAlert("Clock In အရင်လုပ်ရန် လိုအပ်သည်", "warning");
          setLoading(false);
          return;
        }
        if (existingSummaryRecord && existingSummaryRecord.ClockOut) {
          showAlert("ယနေ့အတွက် Clock Out လုပ်ပြီးပါပြီ", "warning");
          setLoading(false);
          return;
        }
      }

      if (existingSummaryRecord) {
        let updateData = {};
        if (actionType === 'ClockOut') {
          const duration = calculateDuration(existingSummaryRecord.ClockIn, timeForDB);
          updateData = { ClockOut: `'${timeForDB}`, Duration: `'${duration}` };
        } else {
          updateData = { ClockIn: `'${timeForDB}`, Status: isLateStatus };
        }
        await updateSheetRowByMatch(ATTENDANCE_TAB, {
          Name: selectedName,
          Date: `'${todayStr}`
        }, updateData);
      } else {
        await appendSheetRow(ATTENDANCE_TAB, {
          Name: selectedName,
          Date: `'${todayStr}`,
          ClockIn: actionType === 'ClockIn' ? `'${timeForDB}` : '',
          ClockOut: actionType === 'ClockOut' ? `'${timeForDB}` : '',
          Duration: '',
          Status: actionType === 'ClockIn' ? isLateStatus : ''
        });
      }

      showAlert(`${selectedName} ${actionType === 'ClockIn' ? 'အလုပ်ဝင်ခြင်း' : 'အလုပ်ဆင်းခြင်း'} အောင်မြင်ပါသည်`, "success");

      updateSummaryImmediately();

      // Telegram Notification
      sendTelegramNotification(selectedName, actionType, timeForDB, actionType === 'ClockIn' ? isLateStatus : '').catch(error => {
        console.error("Telegram notification failed:", error);
      });

      setSelectedName('');
      setTimeout(() => fetchData(true), 200);
    } catch (error) {
      // API Error ဖြစ်ရင် (ဥပမာ 404 Tab Missing) Offline အတိုင်း ပဲ သိမ်းမယ်
      saveOffline();
    } finally {
      setLoading(false);
    }
  };

  const downloadPersonalCSV = () => {
    if (!selectedName) { showAlert("ဝန်ထမ်းအမည် အရင်ရွေးချယ်ပါ", "warning"); return; }
    const personalRecord = summaryRecords.find(r => r.Name === selectedName);
    if (!personalRecord) { showAlert("ယနေ့အတွက် မှတ်တမ်းမရှိသေးပါ", "warning"); return; }
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
      <FloatingItemsBackdrop
        enabled={!!theme.effects?.floatingItems}
        palette={theme.effects?.floatingPalette}
        variant={theme.effects?.floatingVariant}
      />
      <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bgShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
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
        button:hover:not(:disabled) { filter: brightness(1.1); transform: scale(1.02); transition: all 0.2s; }
        button:active:not(:disabled) { transform: scale(0.98); }
      `}</style>

      {/* သင်္ကြန်ပွဲတော် အလှဆင် ပိတောက်ပန်းများ */}
      {theme.images.decoLeftUrl && (
        <img
          src={theme.images.decoLeftUrl}
          alt="Decoration Left"
          className="flower-sway"
          style={styles.flowerLeft}
        />
      )}
      {theme.images.decoRightUrl && (
        <img
          src={theme.images.decoRightUrl}
          alt="Decoration Right"
          className="flower-sway-reverse"
          style={styles.flowerRight}
        />
      )}

      {alert.show && (
        <div className="alert-box" style={{ ...styles.floatingAlert, ...styles[alert.type] }}>
          {alert.type === 'success' ? '✅ ' : alert.type === 'warning' ? '⚠️ ' : '❌ '} {alert.message}
        </div>
      )}

      {/* Network Status & Sync Indicator */}
      <div style={styles.statusContainer}>
        {!isOnline && (
          <div style={styles.offlineBadge}>
            📡 Offline Mode
          </div>
        )}
        {offlineQueue.length > 0 && (
          <div style={styles.syncBadge}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>{isSyncing ? '⏳ Syncing...' : `📦 Pending Sync: ${offlineQueue.length}`}</div>
              <button
                type="button"
                onClick={() => setShowSyncDebug(v => !v)}
                style={styles.syncDebugBtn}
                disabled={loading}
              >
                Debug
              </button>
            </div>
            {showSyncDebug && (
              <div style={styles.syncDebugPanel}>
                <div style={styles.syncDebugRow}>
                  <button type="button" onClick={() => syncOfflineRecords()} style={styles.syncActionBtn} disabled={!isOnline || isSyncing}>
                    Sync now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOfflineQueue([]);
                      localStorage.setItem('attendance_offline_queue', JSON.stringify([]));
                      showAlert('Pending queue cleared', 'warning');
                    }}
                    style={styles.syncActionBtnDanger}
                    disabled={isSyncing}
                  >
                    Clear
                  </button>
                </div>
                <pre style={styles.syncDebugPre}>
                  {JSON.stringify(offlineQueue, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={styles.header}>
        <div style={styles.logoCircle}>
          <img src={theme.images.logoUrl} alt="TGI Logo" style={styles.logoImg} />
        </div>
        <h1 style={styles.mainTitle}>{theme.strings.appTitle}</h1>
        <p style={styles.subTitle}>{theme.strings.appSubtitle}</p>

        {themeAdminEnabled && (
          <div style={styles.themeRow}>
            <label style={styles.themeLabel}>Theme</label>
            <select
              value={themeKey}
              onChange={(e) => setThemeKey(e.target.value)}
              style={styles.themeSelect}
              disabled={loading}
            >
              {Object.keys(themes).map((k) => (
                <option key={k} value={k}>{themes[k].label}</option>
              ))}
            </select>
          </div>
        )}

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
          <EmployeeSelect
            options={employeeOptions}
            value={selectedName}
            onChange={setSelectedName}
            placeholder="-- အမည်ရွေးပါ --"
            disabled={loading}
            styles={styles}
          />
        </div>

        <button onClick={downloadPersonalCSV} style={styles.downloadBtn} disabled={!selectedName || loading}>
          📥 Download My Record (.csv)
        </button>

        <div style={styles.buttonGroup}>
          <button onClick={() => handleAttendance('ClockIn')} style={{ ...styles.button, ...styles.btnIn }} disabled={loading}>Clock In</button>
          <button onClick={() => handleAttendance('ClockOut')} style={{ ...styles.button, ...styles.btnOut }} disabled={loading}>Clock Out</button>
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableHeaderSection}>
          <h3 style={styles.tableTitle}>ယနေ့မှတ်တမ်း (Daily Summary)</h3>
          <button onClick={() => fetchData(true)} style={styles.refreshBtn} disabled={loading}>🔄 Refresh</button>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Clock In</th>
                <th style={styles.th}>Clock Out</th>
                <th style={styles.th}>Duration</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {summaryRecords.length > 0 ? summaryRecords.map((r, i) => (
                <tr key={i} style={styles.tableRow}>
                  <td style={{ ...styles.td, ...styles.tdFirst }}><strong>{r.Name}</strong></td>
                  <td style={styles.td}><span style={styles.inTime}>{r.ClockIn || '-'}</span></td>
                  <td style={styles.td}><span style={styles.outTime}>{r.ClockOut || '-'}</span></td>
                  <td style={styles.td}><span style={r.Duration ? styles.durationBadge : styles.emptyBadge}>{r.Duration || '-'}</span></td>
                  <td style={{ ...styles.td, ...styles.tdLast }}>
                    <span style={r.Status === 'Late' ? styles.lateBadge : r.Status === 'On Time' ? styles.onTimeBadge : styles.emptyBadge}>
                      {r.Status || '-'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" style={styles.noData}>ယနေ့အတွက် မှတ်တမ်းမရှိသေးပါ။</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer style={styles.footer}>
        <p style={styles.footerText}>{theme.strings.footerGreeting}</p>
        <p style={styles.copytighttext}>{theme.strings.footerCopyright}</p>
        <p style={styles.devText}>{theme.strings.footerDev}</p>
      </footer>
    </div>
  );
}

export default App;
