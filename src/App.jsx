import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import HomePage from './pages/HomePage';
import PermitsPage from './pages/PermitsPage';
import UpdatePage from './pages/UpdatePage';
import './App.css';

const LANG_KEY = 'truckmanager_lang';

export const T = {
  ka: {
    dashboard: 'DASHBOARD', permits: 'PERMITS', update: 'UPDATE', files: 'FILES',
    truck: 'სატვირთო', info: 'ინფორმაცია', fuel: 'საწვავი', road: 'გზა', dayTask: 'დღის ტასკი',
    clear: 'გასუფთავება', excel: 'ექსელი', print: 'PRINT',
    truckCount: (n) => n + ' სატვირთო',
    clearConfirm: 'ყველა ჩანაწერი გასუფთავდეს?',
    clearDone: 'ყველა ჩანაწერი გასუფთავდა',
    excelDone: 'ექსელი ჩამოიტვირთა',
    dayNote: 'დღის ინფო / შენიშვნები',
    notePlaceholder: 'დღისთვის საჭირო ინფორმაცია...',
    truckPlaceholder: 'ნომერი...',
    infoPlaceholder: 'ინფო...',
    fuelMarked: 'საწვავი მონიშნული',
    roadMarked: 'გზა მონიშნული',
    dayDone: 'დღე დასრულდა',
    tableClear: 'ცხრილი გასუფთავდა',
    updateClear: 'UPDATE გასუფთავდა',
    updateClearConfirm: 'UPDATE ველი გასუფთავდეს?',
    copy: 'კოპირება', copied: 'კოპირებულია',
    plans: 'სატვირთოების გეგმები',
    pdfOnly: 'მხოლოდ PDF ფაილი',
    openFile: 'გახსნა',
    addTruck: 'სატვირთოს დამატება',
    removeTruck: 'წაშლა',
  },
  en: {
    dashboard: 'DASHBOARD', permits: 'PERMITS', update: 'UPDATE', files: 'FILES',
    truck: 'Truck', info: 'Information', fuel: 'Fuel', road: 'Road', dayTask: 'Day Task',
    clear: 'Clear', excel: 'Excel', print: 'PRINT',
    truckCount: (n) => n + ' trucks',
    clearConfirm: 'Clear all records?',
    clearDone: 'All records cleared',
    excelDone: 'Excel downloaded',
    dayNote: 'Daily Info / Notes',
    notePlaceholder: 'Daily information, notes...',
    truckPlaceholder: 'Number...',
    infoPlaceholder: 'Info...',
    fuelMarked: 'Fuel marked',
    roadMarked: 'Road marked',
    dayDone: 'Day completed',
    tableClear: 'Table cleared',
    updateClear: 'UPDATE cleared',
    updateClearConfirm: 'Clear UPDATE field?',
    copy: 'Copy', copied: 'Copied',
    plans: 'Truck Plans',
    pdfOnly: 'PDF files only',
    openFile: 'Open',
    addTruck: 'Add truck',
    removeTruck: 'Remove',
  }
};

export default function App() {
  const [page, setPage] = useState('home');
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'ka');
  const [notifications, setNotifications] = useState([]);
  const [lastChangeId, setLastChangeId] = useState(null);
  const [firebaseOk, setFirebaseOk] = useState(true);

  const t = T[lang];

  const toggleLang = () => {
    const next = lang === 'ka' ? 'en' : 'ka';
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  };

  const addNotification = useCallback((msg) => {
    const id = Date.now();
    setNotifications(n => [...n, { id, msg }]);
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(doc(db, 'meta', 'lastChange'), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (lastChangeId && data.id !== lastChangeId) {
          addNotification('~ ' + (data.message || 'updated'));
        }
        setLastChangeId(data.id);
      }, () => { setFirebaseOk(false); });
    } catch (e) { setFirebaseOk(false); }
    return () => unsub && unsub();
  }, [lastChangeId, addNotification]);

  const notifyChange = async (message) => {
    const id = Date.now().toString();
    try {
      await setDoc(doc(db, 'meta', 'lastChange'), { id, message, ts: serverTimestamp() });
    } catch (e) {}
  };

  const navItems = [
    { id: 'home', label: t.dashboard, short: 'DASH' },
    { id: 'permits', label: t.permits, short: 'PRMT' },
    { id: 'update', label: t.update, short: 'UPDT' },
    { id: 'files', label: t.files, short: 'FILE' },
  ];

  const fileUrl = 'https://fructustransportcom.sharepoint.com/:x:/s/FRUCTUS/IQBr8-5TMn4pQK62TFL03UcbAfX4GLcijJ2hSmM1780qWHQ?e=Z6ZUXW';

  return (
    <div className="app-root">
      <div className="notif-stack">
        {notifications.map(n => (
          <div key={n.id} className="notification">{n.msg}</div>
        ))}
      </div>
      <nav className="nav no-print">
        <div className="nav-brand">
          <span className="brand-icon">&#9651;</span>
          <span className="brand-text">TRUCK<span className="accent">MGR</span></span>
        </div>
        <div className="nav-links">
          {navItems.map(item => (
            <button
              key={item.id}
              className={'nav-btn' + (page === item.id ? ' active' : '')}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-full">{item.label}</span>
              <span className="nav-short">{item.short}</span>
            </button>
          ))}
        </div>
        <button className="lang-btn" onClick={toggleLang}>
          {lang === 'ka' ? 'EN' : 'KA'}
        </button>
        {!firebaseOk && <div className="firebase-warn">LOCAL</div>}
      </nav>
      <main className="main-content">
        {page === 'home' && <HomePage notifyChange={notifyChange} addNotification={addNotification} t={t} />}
        {page === 'permits' && <PermitsPage notifyChange={notifyChange} addNotification={addNotification} t={t} />}
        {page === 'update' && <UpdatePage notifyChange={notifyChange} addNotification={addNotification} t={t} />}
        {page === 'files' && (
          <div style={{padding: '20px'}}>
            <h1 style={{color: 'var(--accent)', fontFamily: 'var(--sans)', letterSpacing: '3px', marginBottom: '24px'}}>FILES</h1>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'10px',background:'rgba(0,120,212,0.15)',color:'#4fc3f7',border:'1px solid #0078d4',borderRadius:'6px',padding:'14px 24px',fontFamily:'var(--sans)',fontWeight:'700',fontSize:'16px',textDecoration:'none'}}>
              Ladunki.xlsx - {t.openFile}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
