import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import './UpdatePage.css';

const LOCAL_KEY = 'truckmanager_update_v2';

export default function UpdatePage({ notifyChange, addNotification }) {
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
        if (snap.exists() && snap.data().text !== undefined) {
          setText(snap.data().text);
        }
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
        await notifyChange('📝 UPDATE გვერდი განახლდა');
        setLastSaved(new Date());
      } catch {}
      setSyncing(false);
    }, 1200);
  }, [notifyChange]);

  const handleChange = (val) => {
    setText(val);
    persist(val);
  };

  const clearText = () => {
    if (!window.confirm('UPDATE ველი გასუფთავდეს?')) return;
    handleChange('');
    addNotification('🗑 UPDATE გასუფთავდა');
  };

  const copyText = () => {
    navigator.clipboard.writeText(text).then(() => addNotification('📋 კოპირებულია'));
  };

  // Parse lines for highlighting
  const lines = text.split('\n');

  return (
    <div className="update-page">
      <div className="update-header no-print">
        <h1 className="page-title">📝 UPDATE</h1>
        <div className="update-meta">
          {syncing && <span className="sync-ind">↑ SYNC</span>}
          {lastSaved && !syncing && (
            <span className="saved-ind">
              ✓ {lastSaved.toLocaleTimeString('ka-GE')}
            </span>
          )}
        </div>
        <div className="update-actions">
          <button className="action-btn copy" onClick={copyText}>📋 კოპირება</button>
          <button className="action-btn clear" onClick={clearText}>🗑 გასუფთავება</button>
        </div>
      </div>

      <div className="update-body">
        {/* Editor */}
        <div className="editor-wrap">
          <div className="editor-label">სატვირთოების გეგმები</div>
          <div className="editor-container">
            {/* Line numbers */}
            <div className="line-numbers">
              {lines.map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <textarea
              className="update-textarea"
              value={text}
              onChange={e => handleChange(e.target.value)}
              placeholder={`evans - going to bremerhaven\nkryvoruchenko - going to niepolomice\ndima - going to base\n\n...`}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Preview */}
        {text.trim() && (
          <div className="preview-wrap">
            <div className="editor-label">Preview</div>
            <div className="preview-box">
              {lines.filter(l => l.trim()).map((line, i) => {
                const dashIdx = line.indexOf(' - ');
                if (dashIdx > -1) {
                  const driver = line.slice(0, dashIdx);
                  const plan = line.slice(dashIdx + 3);
                  return (
                    <div key={i} className="preview-line">
                      <span className="prev-driver">{driver}</span>
                      <span className="prev-sep"> → </span>
                      <span className="prev-plan">{plan}</span>
                    </div>
                  );
                }
                return (
                  <div key={i} className="preview-line preview-plain">{line}</div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
