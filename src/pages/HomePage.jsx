import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import './HomePage.css';

const DEFAULT_TRUCK = () => ({
  id: Date.now() + Math.random(),
  number: '',
  info: '',
  fuel: false,
  road: false,
  done: false,
});

const STORAGE_KEY = 'truckmanager_home_v2';

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLocal(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = n => String(n).padStart(2, '0');
  const d = now;
  return (
    <span className="clock">
      {pad(d.getDate())}.{pad(d.getMonth()+1)}.{d.getFullYear()} &nbsp;
      {pad(d.getHours())}:{pad(d.getMinutes())}:{pad(d.getSeconds())}
    </span>
  );
}

export default function HomePage({ notifyChange, addNotification }) {
  const [trucks, setTrucks] = useState(() => {
    const local = loadLocal();
    return local?.trucks || [DEFAULT_TRUCK(), DEFAULT_TRUCK(), DEFAULT_TRUCK()];
  });
  const [note, setNote] = useState(() => loadLocal()?.note || '');
  const [syncing, setSyncing] = useState(false);
  const debounceRef = useRef(null);

  // Sync from Firebase
  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(doc(db, 'data', 'home'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setTrucks(d.trucks || [DEFAULT_TRUCK()]);
          setNote(d.note || '');
        }
      }, () => {});
    } catch {}
    return () => unsub && unsub();
  }, []);

  const persist = useCallback((newTrucks, newNote) => {
    saveLocal({ trucks: newTrucks, note: newNote });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSyncing(true);
      try {
        await setDoc(doc(db, 'data', 'home'), { trucks: newTrucks, note: newNote });
      } catch {}
      setSyncing(false);
    }, 800);
  }, []);

  const updateTruck = (idx, field, value) => {
    const next = trucks.map((t, i) => i === idx ? { ...t, [field]: value } : t);
    setTrucks(next);
    persist(next, note);
    if (field === 'done' && value) {
      notifyChange(`🚛 სატვირთო "${trucks[idx].number || '#'+(idx+1)}" — დღე დასრულდა`);
    } else if (field === 'fuel' && value) {
      notifyChange(`⛽ სატვირთო "${trucks[idx].number || '#'+(idx+1)}" — საწვავი მონიშნული`);
    } else if (field === 'road' && value) {
      notifyChange(`🛣 სატვირთო "${trucks[idx].number || '#'+(idx+1)}" — გზა მონიშნული`);
    }
  };

  const addTruck = () => {
    const next = [...trucks, DEFAULT_TRUCK()];
    setTrucks(next);
    persist(next, note);
  };

  const removeTruck = () => {
    if (trucks.length <= 1) return;
    const next = trucks.slice(0, -1);
    setTrucks(next);
    persist(next, note);
  };

  const clearAll = () => {
    if (!window.confirm('ყველა ჩანაწერი გასუფთავდეს?')) return;
    const next = [DEFAULT_TRUCK(), DEFAULT_TRUCK(), DEFAULT_TRUCK()];
    const newNote = '';
    setTrucks(next);
    setNote(newNote);
    persist(next, newNote);
    addNotification('🗑 ყველა ჩანაწერი გასუფთავდა');
    notifyChange('🗑 ცხრილი გასუფთავდა');
  };

  const updateNote = (v) => {
    setNote(v);
    persist(trucks, v);
  };

  const exportExcel = () => {
    const rows = trucks.map((t, i) => ({
      '#': i + 1,
      'სატვირთო': t.number,
      'ინფორმაცია': t.info,
      'საწვავი': t.fuel ? '✓' : '✗',
      'გზა': t.road ? '✓' : '✗',
      'დღის ტასკი': t.done ? '✓' : '✗',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trucks');
    const date = new Date().toLocaleDateString('ka-GE').replace(/\//g, '-');
    XLSX.writeFile(wb, `trucks_${date}.xlsx`);
    addNotification('📊 ექსელი ჩამოიტვირთა');
  };

  const printPage = () => window.print();

  return (
    <div className="home-page">
      {/* Header bar */}
      <div className="home-header no-print">
        <div className="header-left">
          <button className="ctrl-btn add" onClick={addTruck} title="სატვირთოს დამატება">+</button>
          <button className="ctrl-btn rem" onClick={removeTruck} title="ბოლო სატვირთოს წაშლა">−</button>
          <span className="truck-count">{trucks.length} სატვირთო</span>
          {syncing && <span className="sync-ind">↑ SYNC</span>}
        </div>
        <Clock />
        <div className="header-right">
          <button className="action-btn clear" onClick={clearAll}>🗑 გასუფთავება</button>
          <button className="action-btn excel" onClick={exportExcel}>📊 ექსელი</button>
          <button className="action-btn print" onClick={printPage}>🖨 PRINT</button>
        </div>
      </div>

      {/* Print header */}
      <div className="print-only print-header">
        <h2>TRUCK MANAGER — <Clock /></h2>
      </div>

      {/* Table wrapper */}
      <div className="table-wrap">
        <table className="truck-table">
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th className="col-truck">სატვირთო</th>
              <th className="col-info">ინფორმაცია</th>
              <th className="col-check">⛽ საწვავი</th>
              <th className="col-check">🛣 გზა</th>
              <th className="col-check">✅ დღის ტასკი</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((truck, idx) => (
              <tr
                key={truck.id}
                className={`truck-row ${truck.done ? 'row-done' : ''}`}
              >
                <td className="col-num td-num">{idx + 1}</td>

                <td className="col-truck">
                  <input
                    className="cell-input truck-input"
                    value={truck.number}
                    onChange={e => updateTruck(idx, 'number', e.target.value)}
                    placeholder="ნომერი..."
                  />
                </td>

                <td className="col-info">
                  <input
                    className="cell-input info-input"
                    value={truck.info}
                    onChange={e => updateTruck(idx, 'info', e.target.value)}
                    placeholder="ინფო..."
                  />
                </td>

                <td className={`col-check td-check ${truck.fuel ? 'cell-green' : 'cell-red'}`}>
                  <div className="check-cell">
                    <input
                      type="checkbox"
                      checked={truck.fuel}
                      onChange={e => updateTruck(idx, 'fuel', e.target.checked)}
                    />
                  </div>
                </td>

                <td className={`col-check td-check ${truck.road ? 'cell-green' : 'cell-red'}`}>
                  <div className="check-cell">
                    <input
                      type="checkbox"
                      checked={truck.road}
                      onChange={e => updateTruck(idx, 'road', e.target.checked)}
                    />
                  </div>
                </td>

                <td className={`col-check td-check ${truck.done ? 'cell-done' : ''}`}>
                  <div className="check-cell">
                    <input
                      type="checkbox"
                      checked={truck.done}
                      onChange={e => updateTruck(idx, 'done', e.target.checked)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sticky note */}
      <div className="sticky-section">
        <div className="sticky-label">📌 დღის ინფო / შენიშვნები</div>
        <textarea
          className="sticky-note"
          value={note}
          onChange={e => updateNote(e.target.value)}
          placeholder="დღისთვის საჭირო ინფორმაცია, შენიშვნები..."
          rows={5}
        />
      </div>
    </div>
  );
}
