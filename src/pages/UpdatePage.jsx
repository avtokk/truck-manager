import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import './UpdatePage.css';

const LOCAL_KEY = 'truckmanager_update_v2';

export default function UpdatePage({ notifyChange, addNotification, t }) {
  const [text, setText] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '""'); } catch { return ''; }
  });
  const [lastSaved, setLastSaved] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(doc(db, 'data', 'update'), (snap) => {
        if (snap.exists() && snap.data().text !== undefined) setText(snap.data().text);
      }, () => {});
    } catch {}
    return () => unsub && unsub();
  }, []);

  const persist = useCallback((val) => {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(val)); } catch {}
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSyncing(true);
      try {
        await setDoc(doc(db, 'data', 'update'), { text: val });
        await notifyChange('UPDATE page updated');
        setLastSaved(new Date());
      } catch {}
      setSyncing(false);
    }, 1200);
  }, [notifyChange]);

  const handleChange = (val) => { setText(val); persist(val); };

  const clearText = () => {
    if (!window.confirm(t.updateClearConfirm)) return;
    handleChange(''); addNotification(t.updateClear);
  };

  const copyText = () => {
    navigator.clipboard.writeText(text).then(() => addNotification(t.copied));
  };

  const lines = text.split('\n');

  return (
    <div className="update-page">
      <div className="update-header no-print">
        <h1 className="page-title">{t.update}</h1>
        <div className="update-meta">
          {syncing && <span className="sync-ind">&#8593; SYNC</span>}
          {lastSaved && !syncing && <span className="saved-ind">&#10003; {lastSaved.toLocaleTimeString()}</span>}
        </div>
        <div className="update-actions">
          <button className="action-btn copy" onClick={copyText}>&#128203; {t.copy}</button>
          <button className="action-btn clear" onClick={clearText}>&#128465; {t.clear}</button>
        </div>
      </div>
      <div className="editor-wrap-full">
        <div className="editor-label">{t.plans}</div>
        <div className="editor-container">
          <div className="line-numbers">
            {lines.map((_, i) => <span key={i}>{i+1}</span>)}
          </div>
          <textarea
            className="update-textarea"
            value={text}
            onChange={e => handleChange(e.target.value)}
            placeholder={'evans - going to bremerhaven\nkryvoruchenko - going to niepolomice\ndima - going to base'}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
