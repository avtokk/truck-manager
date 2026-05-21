import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
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
  return (
    <span className="clock">
      {pad(now.getDate())}.{pad(now.getMonth()+1)}.{now.getFullYear()} &nbsp;
      {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
    </span>
  );
}

export default function HomePage({ notifyChange, addNotification, t }) {
  const [trucks, setTrucks] = useState(() => {
    const l = loadLocal(); return l?.trucks || [DEFAULT_TRUCK(), DEFAULT_TRUCK(), DEFAULT_TRUCK()];
  });
  const [note, setNote] = useState(() => loadLocal()?.note || '');
  const [syncing, setSyncing] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(doc(db, 'data', 'home'), (snap) => {
        if (snap.exists()) { const d = snap.data(); setTrucks(d.trucks || [DEFAULT_TRUCK()]); setNote(d.note || ''); }
      }, () => {});
    } catch {}
    return () => unsub && unsub();
  }, []);

  const persist = useCallback((newTrucks, newNote) => {
    saveLocal({ trucks: newTrucks, note: newNote });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSyncing(true);
      try { await setDoc(doc(db, 'data', 'home'), { trucks: newTrucks, note: newNote }); } catch {}
      setSyncing(false);
    }, 800);
  }, []);

  const updateTruck = (idx, field, value) => {
    const next = trucks.map((tr, i) => i === idx ? { ...tr, [field]: value } : tr);
    setTrucks(next); persist(next, note);
    if (field === 'done' && value) notifyChange('truck ' + (trucks[idx].number || '#'+(idx+1)) + ': ' + t.dayDone);
    else if (field === 'fuel' && value) notifyChange('truck ' + (trucks[idx].number || '#'+(idx+1)) + ': ' + t.fuelMarked);
    else if (field === 'road' && value) notifyChange('truck ' + (trucks[idx].number || '#'+(idx+1)) + ': ' + t.roadMarked);
  };

  const addTruck = () => { const next = [...trucks, DEFAULT_TRUCK()]; setTrucks(next); persist(next, note); };
  const removeTruck = () => { if (trucks.length <= 1) return; const next = trucks.slice(0,-1); setTrucks(next); persist(next, note); };

  const clearAll = () => {
    if (!window.confirm(t.clearConfirm)) return;
    const next = [DEFAULT_TRUCK(), DEFAULT_TRUCK(), DEFAULT_TRUCK()];
    setTrucks(next); setNote(''); persist(next, '');
    addNotification(t.clearDone); notifyChange(t.tableClear);
  };

  const updateNote = (v) => { setNote(v); persist(trucks, v); };

  const exportExcel = () => {
    const rows = trucks.map((tr, i) => ({
      '#': i+1, [t.truck]: tr.number, [t.info]: tr.info,
      [t.fuel]: tr.fuel ? 'Y' : 'N', [t.road]: tr.road ? 'Y' : 'N', [t.dayTask]: tr.done ? 'Y' : 'N',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trucks');
    XLSX.writeFile(wb, 'trucks_' + new Date().toLocaleDateString().replace(/\//g,'-') + '.xlsx');
    addNotification(t.excelDone);
  };

  return (
    <div className="home-page">
      <div className="home-header no-print">
        <div className="header-left">
          <button className="ctrl-btn add" onClick={addTruck} title={t.addTruck}>+</button>
          <button className="ctrl-btn rem" onClick={removeTruck} title={t.removeTruck}>&#8722;</button>
          <span className="truck-count">{t.truckCount(trucks.length)}</span>
          {syncing && <span className="sync-ind">&#8593; SYNC</span>}
        </div>
        <Clock />
        <div className="header-right">
          <button className="action-btn clear" onClick={clearAll}>&#128465; {t.clear}</button>
          <button className="action-btn excel" onClick={exportExcel}>&#128202; {t.excel}</button>
          <button className="action-btn print" onClick={() => window.print()}>&#128424; {t.print}</button>
        </div>
      </div>
      <div className="print-only print-header"><h2>TRUCK MANAGER</h2></div>
      <div className="table-wrap">
        <table className="truck-table">
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th className="col-truck">{t.truck}</th>
              <th className="col-info">{t.info}</th>
              <th className="col-check">{t.fuel}</th>
              <th className="col-check">{t.road}</th>
              <th className="col-check">{t.dayTask}</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((truck, idx) => (
              <tr key={truck.id} className={'truck-row' + (truck.done ? ' row-done' : '')}>
                <td className="col-num td-num">{idx+1}</td>
                <td className="col-truck">
                  <input className="cell-input truck-input" value={truck.number} onChange={e => updateTruck(idx,'number',e.target.value)} placeholder={t.truckPlaceholder} />
                </td>
                <td className="col-info">
                  <input className="cell-input info-input" value={truck.info} onChange={e => updateTruck(idx,'info',e.target.value)} placeholder={t.infoPlaceholder} />
                </td>
                <td className={'col-check td-check ' + (truck.fuel ? 'cell-green' : 'cell-red')}>
                  <div className="check-cell"><input type="checkbox" checked={truck.fuel} onChange={e => updateTruck(idx,'fuel',e.target.checked)} /></div>
                </td>
                <td className={'col-check td-check ' + (truck.road ? 'cell-green' : 'cell-red')}>
                  <div className="check-cell"><input type="checkbox" checked={truck.road} onChange={e => updateTruck(idx,'road',e.target.checked)} /></div>
                </td>
                <td className={'col-check td-check ' + (truck.done ? 'cell-done' : '')}>
                  <div className="check-cell"><input type="checkbox" checked={truck.done} onChange={e => updateTruck(idx,'done',e.target.checked)} /></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sticky-section">
        <div className="sticky-label">&#128204; {t.dayNote}</div>
        <textarea className="sticky-note" value={note} onChange={e => updateNote(e.target.value)} placeholder={t.notePlaceholder} rows={5} />
      </div>
    </div>
  );
}
